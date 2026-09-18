#!/usr/bin/env python3
"""
Focused dual-engine tests for the Directory database abstraction.

Covers:
  - SQLite via DATABASE_FILE / Database(path) constructor compatibility
  - PostgreSQL via DATABASE_URL when available (skipped if not reachable)
  - ? placeholder conversion, commit/rollback, result mapping

Usage:
  python test_database_engines.py
  DATABASE_URL=postgresql+psycopg://... python test_database_engines.py
"""
from __future__ import annotations

import os
import sys
import tempfile
import types
import unittest
from pathlib import Path

# Ensure local imports resolve when run from src/directory
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from database import (  # noqa: E402
    Database,
    create_db_engine,
    reset_db_instance,
    _convert_qmark_params,
)


def _install_fake_flask_g():
    """Provide a minimal flask.g so Database.execute works outside Flask."""
    class G:
        pass

    g = G()
    fake = types.ModuleType("flask")
    fake.g = g
    sys.modules["flask"] = fake
    return g


class PlaceholderConversionTests(unittest.TestCase):
    def test_qmark_to_named(self):
        sql, named = _convert_qmark_params(
            "INSERT INTO t (a, b) VALUES (?, ?)", ("x", 1)
        )
        self.assertEqual(sql, "INSERT INTO t (a, b) VALUES (:p0, :p1)")
        self.assertEqual(named, {"p0": "x", "p1": 1})

    def test_no_params(self):
        sql, named = _convert_qmark_params("SELECT 1", ())
        self.assertEqual(sql, "SELECT 1")
        self.assertEqual(named, {})

    def test_mismatch_raises(self):
        with self.assertRaises(ValueError):
            _convert_qmark_params("SELECT ? FROM t", ())


class SQLiteEngineTests(unittest.TestCase):
    def setUp(self):
        self._tmpdir = tempfile.mkdtemp()
        self.db_path = os.path.join(self._tmpdir, "engine_test.db")
        reset_db_instance()
        self._g = _install_fake_flask_g()

    def tearDown(self):
        reset_db_instance()
        try:
            Path(self.db_path).unlink(missing_ok=True)
        except Exception:
            pass

    def test_positional_path_constructor(self):
        """Legacy Database('/path/to.db') must still work."""
        db = Database(self.db_path)
        self.assertEqual(db.dialect, "sqlite")
        self.assertTrue(Path(self.db_path).exists())

    def test_keyword_database_file(self):
        db = Database(database_file=self.db_path)
        self.assertEqual(db.dialect, "sqlite")

    def test_schema_bootstrap_creates_tables(self):
        db = Database(database_file=self.db_path)
        cur = db.execute(
            "SELECT name FROM sqlite_master WHERE type='table' AND name=?",
            ("domains",),
        )
        row = cur.fetchone()
        self.assertIsNotNone(row)
        self.assertEqual(dict(row)["name"], "domains")

    def test_insert_select_commit(self):
        db = Database(database_file=self.db_path)
        db.execute(
            "INSERT INTO domains (id, name, description, is_default) VALUES (?, ?, ?, ?)",
            ("d1", "Acme", "test", 0),
        )
        db.commit()
        cur = db.execute("SELECT id, name FROM domains WHERE id = ?", ("d1",))
        row = dict(cur.fetchone())
        self.assertEqual(row["id"], "d1")
        self.assertEqual(row["name"], "Acme")

    def test_rollback(self):
        db = Database(database_file=self.db_path)
        db.execute(
            "INSERT INTO domains (id, name) VALUES (?, ?)",
            ("d-roll", "RollbackMe"),
        )
        db.rollback()
        cur = db.execute("SELECT id FROM domains WHERE id = ?", ("d-roll",))
        self.assertIsNone(cur.fetchone())

    def test_check_constraint_empty_name(self):
        db = Database(database_file=self.db_path)
        with self.assertRaises(Exception):
            db.execute(
                "INSERT INTO domains (id, name) VALUES (?, ?)",
                ("d-empty", ""),
            )
            db.commit()


class PostgreSQLEngineTests(unittest.TestCase):
    """Run only when DATABASE_URL points at a reachable Postgres instance."""

    @classmethod
    def setUpClass(cls):
        cls.url = os.environ.get("DATABASE_URL")
        if not cls.url:
            raise unittest.SkipTest("DATABASE_URL not set; skipping PostgreSQL tests")
        try:
            engine = create_db_engine(database_url=cls.url)
            with engine.connect() as conn:
                conn.exec_driver_sql("SELECT 1")
            engine.dispose()
        except Exception as e:
            raise unittest.SkipTest(f"PostgreSQL not reachable: {e}")

    def setUp(self):
        reset_db_instance()
        self._g = _install_fake_flask_g()
        self.db = Database(database_url=self.url, initialize_schema=True)

    def tearDown(self):
        try:
            self.db.execute(
                "DELETE FROM domains WHERE id LIKE ?",
                ("pg-test-%",),
            )
            self.db.commit()
        except Exception:
            try:
                self.db.rollback()
            except Exception:
                pass
        reset_db_instance()

    def test_dialect_is_postgresql(self):
        self.assertIn(self.db.dialect, ("postgresql", "postgres"))

    def test_insert_select_commit(self):
        self.db.execute(
            "INSERT INTO domains (id, name, description, is_default) VALUES (?, ?, ?, ?)",
            ("pg-test-1", "PgAcme", "pg test", False),
        )
        self.db.commit()
        cur = self.db.execute(
            "SELECT id, name FROM domains WHERE id = ?", ("pg-test-1",)
        )
        row = dict(cur.fetchone())
        self.assertEqual(row["id"], "pg-test-1")
        self.assertEqual(row["name"], "PgAcme")

    def test_rollback(self):
        self.db.execute(
            "INSERT INTO domains (id, name) VALUES (?, ?)",
            ("pg-test-roll", "Roll"),
        )
        self.db.rollback()
        cur = self.db.execute(
            "SELECT id FROM domains WHERE id = ?", ("pg-test-roll",)
        )
        self.assertIsNone(cur.fetchone())


if __name__ == "__main__":
    unittest.main(verbosity=2)
