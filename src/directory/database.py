"""
Database abstraction for the Directory service.

Supports:
- SQLite via DATABASE_FILE (default for development / single-node)
- PostgreSQL via DATABASE_URL (production / multi-instance)

Uses SQLAlchemy 2.x Core + psycopg (v3) for PostgreSQL.
Public API is kept compatible with the previous sqlite3 wrapper so that
existing model code continues to work with minimal changes:
  - get_db() -> Database
  - db.execute(query, params)  (supports ? placeholders)
  - db.commit() / db.rollback()
  - close_db() for Flask request teardown
"""
from __future__ import annotations

import logging
import os
import re
from pathlib import Path
from typing import Any, Optional, Sequence, Union
from urllib.parse import urlparse

from sqlalchemy import create_engine, event, text
from sqlalchemy.engine import Connection, Engine, Result
from sqlalchemy.pool import StaticPool

logger = logging.getLogger("remote-directory")

# ---------------------------------------------------------------------------
# Engine factory
# ---------------------------------------------------------------------------

def _is_postgres_url(url: str) -> bool:
    scheme = urlparse(url).scheme.lower()
    return scheme in ("postgres", "postgresql", "postgresql+psycopg")


def _normalize_database_url(url: str) -> str:
    """Ensure SQLAlchemy uses the psycopg (v3) driver for PostgreSQL."""
    if url.startswith("postgres://"):
        return "postgresql+psycopg://" + url[len("postgres://") :]
    if url.startswith("postgresql://") and "+psycopg" not in url:
        return "postgresql+psycopg://" + url[len("postgresql://") :]
    return url


def create_db_engine(
    database_url: Optional[str] = None,
    database_file: Optional[str] = None,
) -> Engine:
    """
    Create a SQLAlchemy Engine.

    Priority:
      1. Explicit database_url argument
      2. DATABASE_URL environment variable (PostgreSQL)
      3. database_file argument / DATABASE_FILE / default SQLite path
    """
    url = database_url or os.environ.get("DATABASE_URL")
    if url:
        url = _normalize_database_url(url)
        logger.info("[DB] Using PostgreSQL engine from DATABASE_URL")
        engine = create_engine(
            url,
            pool_pre_ping=True,
            pool_size=5,
            max_overflow=10,
            future=True,
        )
        return engine

    # SQLite path
    db_path = database_file or os.environ.get("DATABASE_FILE", "/app/data/users.db")
    db_dir = os.path.dirname(db_path)
    if db_dir:
        Path(db_dir).mkdir(parents=True, exist_ok=True)

    sqlite_url = f"sqlite:///{db_path}"
    logger.info("[DB] Using SQLite engine at %s", db_path)
    engine = create_engine(
        sqlite_url,
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
        future=True,
    )

    @event.listens_for(engine, "connect")
    def _set_sqlite_pragma(dbapi_conn, connection_record):
        cursor = dbapi_conn.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()

    return engine


# ---------------------------------------------------------------------------
# Placeholder conversion (? -> :p0, :p1, ...)
# ---------------------------------------------------------------------------

_PLACEHOLDER_RE = re.compile(r"\?")


def _convert_qmark_params(query: str, params: Sequence[Any]) -> tuple[str, dict]:
    """Convert sqlite-style ? placeholders to SQLAlchemy named parameters."""
    params = tuple(params) if params is not None else ()
    named: dict[str, Any] = {}
    idx = 0

    def _repl(_match: re.Match) -> str:
        nonlocal idx
        if idx >= len(params):
            raise ValueError(
                f"Parameter count mismatch: query has more placeholders than "
                f"the {len(params)} values provided"
            )
        key = f"p{idx}"
        named[key] = params[idx]
        idx += 1
        return f":{key}"

    converted = _PLACEHOLDER_RE.sub(_repl, query)
    if idx != len(params):
        raise ValueError(
            f"Parameter count mismatch: query has {idx} placeholders, "
            f"got {len(params)} values"
        )
    return converted, named


# ---------------------------------------------------------------------------
# Connection / cursor compatibility wrapper
# ---------------------------------------------------------------------------

class CursorResult:
    """Thin wrapper so model code can call fetchone() / fetchall() / lastrowid."""

    def __init__(self, result: Result, connection: Connection):
        self._result = result
        self._connection = connection
        self.lastrowid: Any = None
        try:
            if connection.dialect.name == "sqlite":
                raw = connection.connection.dbapi_connection
                self.lastrowid = getattr(raw, "lastrowid", None)
        except Exception:
            pass

    def fetchone(self):
        row = self._result.fetchone()
        if row is None:
            return None
        return row._mapping

    def fetchall(self):
        rows = self._result.fetchall()
        return [r._mapping for r in rows]

    def __iter__(self):
        for r in self._result:
            yield r._mapping


class Database:
    """
    Database facade used by the Directory models and Flask app.

    Holds the SQLAlchemy Engine and provides per-request connections via
    Flask's `g` object (same contract as the previous sqlite3 implementation).
    """

    def __init__(
        self,
        engine: Optional[Engine | str] = None,
        database_url: Optional[str] = None,
        database_file: Optional[str] = None,
        initialize_schema: bool = True,
    ):
        """
        Create a Database facade.

        Backward-compatible positional form used by existing tests/scripts:
            Database("/path/to/file.db")  # treated as database_file (SQLite)

        Keyword forms:
            Database(database_file=...)
            Database(database_url=...)
            Database(engine=<SQLAlchemy Engine>)
        """
        # Legacy: first positional argument was the SQLite path string.
        if isinstance(engine, str):
            database_file = database_file or engine
            engine = None

        self.engine = engine or create_db_engine(
            database_url=database_url, database_file=database_file
        )
        self.dialect = self.engine.dialect.name  # "sqlite" or "postgresql"
        if initialize_schema:
            self._initialize_schema()

    def get_connection(self) -> Connection:
        """Return the per-request connection stored on Flask's `g`."""
        from flask import g

        if not hasattr(g, "db") or g.db is None or getattr(g.db, "closed", True):
            g.db = self.engine.connect()
            g.db_tx = g.db.begin()
        return g.db

    def execute(self, query: str, params: Union[tuple, list, dict, None] = ()) -> CursorResult:
        """
        Execute a SQL statement.

        Accepts classic sqlite3-style `?` placeholders and a sequence of
        parameters, or a dict of named parameters.
        """
        conn = self.get_connection()
        try:
            if params is None:
                params = ()
            if isinstance(params, dict):
                stmt = text(query)
                result = conn.execute(stmt, params)
            else:
                converted, named = _convert_qmark_params(query, tuple(params))
                stmt = text(converted)
                result = conn.execute(stmt, named)
            return CursorResult(result, conn)
        except Exception as e:
            logger.error("[DB] Query execution failed: %s", e)
            raise

    def commit(self) -> None:
        from flask import g

        if hasattr(g, "db_tx") and g.db_tx is not None:
            g.db_tx.commit()
            g.db_tx = None
            if hasattr(g, "db") and g.db is not None and not g.db.closed:
                g.db_tx = g.db.begin()
        elif hasattr(g, "db") and g.db is not None and not g.db.closed:
            g.db.commit()

    def rollback(self) -> None:
        from flask import g

        if hasattr(g, "db_tx") and g.db_tx is not None:
            g.db_tx.rollback()
            g.db_tx = None
            if hasattr(g, "db") and g.db is not None and not g.db.closed:
                g.db_tx = g.db.begin()
        elif hasattr(g, "db") and g.db is not None and not g.db.closed:
            g.db.rollback()

    def _initialize_schema(self) -> None:
        """Create tables if they do not already exist (cross-engine DDL)."""
        ddl_statements = [
            """
            CREATE TABLE IF NOT EXISTS domains (
                id TEXT PRIMARY KEY,
                name TEXT UNIQUE NOT NULL CHECK (length(trim(name)) > 0),
                description TEXT,
                is_default BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
            """,
            """
            CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                username TEXT UNIQUE NOT NULL CHECK (length(trim(username)) > 0),
                password TEXT NOT NULL CHECK (length(trim(password)) > 0),
                first_name TEXT,
                last_name TEXT,
                display_name TEXT,
                domain_id TEXT NOT NULL,
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (domain_id) REFERENCES domains(id) ON DELETE RESTRICT
            )
            """,
            """
            CREATE TABLE IF NOT EXISTS user_emails (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                email TEXT UNIQUE NOT NULL CHECK (length(trim(email)) > 0),
                is_primary BOOLEAN DEFAULT FALSE,
                is_verified BOOLEAN DEFAULT FALSE,
                verified_at TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
            """,
            """
            CREATE TABLE IF NOT EXISTS user_properties (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                key TEXT NOT NULL,
                value TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE (user_id, key),
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
            """,
            """
            CREATE TABLE IF NOT EXISTS roles (
                id TEXT PRIMARY KEY,
                name TEXT UNIQUE NOT NULL CHECK (length(trim(name)) > 0),
                description TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
            """,
            """
            CREATE TABLE IF NOT EXISTS user_roles (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                role_id TEXT NOT NULL,
                assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE (user_id, role_id),
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE
            )
            """,
            """
            CREATE TABLE IF NOT EXISTS groups (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL CHECK (length(trim(name)) > 0),
                description TEXT,
                domain_id TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE (domain_id, name),
                FOREIGN KEY (domain_id) REFERENCES domains(id) ON DELETE CASCADE
            )
            """,
            """
            CREATE TABLE IF NOT EXISTS user_groups (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                group_id TEXT NOT NULL,
                assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE (user_id, group_id),
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE
            )
            """,
            """
            CREATE TABLE IF NOT EXISTS property_keys (
                id TEXT PRIMARY KEY,
                key TEXT UNIQUE NOT NULL,
                display_name TEXT,
                description TEXT,
                data_type TEXT DEFAULT 'string',
                is_required BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
            """,
            """
            CREATE TABLE IF NOT EXISTS audit_logs (
                id TEXT PRIMARY KEY,
                entity_type TEXT NOT NULL,
                entity_id TEXT NOT NULL,
                action TEXT NOT NULL,
                changes TEXT,
                performed_by TEXT,
                ip_address TEXT,
                user_agent TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
            """,
        ]

        try:
            with self.engine.begin() as conn:
                for stmt in ddl_statements:
                    conn.execute(text(stmt))
            logger.info("[DB] Database schema initialized successfully (%s)", self.dialect)
        except Exception as e:
            logger.error("[DB] Failed to initialize schema: %s", e)
            raise


# ---------------------------------------------------------------------------
# Module-level helpers (Flask integration)
# ---------------------------------------------------------------------------

_db_instance: Optional[Database] = None


def get_db() -> Database:
    """Return the process-wide Database instance (lazy-created)."""
    global _db_instance
    if _db_instance is None:
        _db_instance = Database()
    return _db_instance


def close_db(e=None) -> None:
    """Close the per-request connection (Flask teardown handler)."""
    from flask import g

    tx = g.pop("db_tx", None)
    if tx is not None:
        try:
            tx.commit()
        except Exception:
            try:
                tx.rollback()
            except Exception:
                pass
    db = g.pop("db", None)
    if db is not None and not db.closed:
        db.close()
        logger.debug("[DB] Per-request connection closed")


def init_schema() -> Database:
    """Ensure the global Database (and its schema) is ready."""
    return get_db()


def reset_db_instance() -> None:
    """Test helper: discard the cached Database so a new one is created."""
    global _db_instance
    if _db_instance is not None:
        try:
            _db_instance.engine.dispose()
        except Exception:
            pass
    _db_instance = None
