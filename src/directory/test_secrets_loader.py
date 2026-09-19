#!/usr/bin/env python3
"""Tests for secrets_loader and production fail-fast behaviour."""
from __future__ import annotations

import os
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from secrets_loader import (  # noqa: E402
    KNOWN_DEVELOPMENT_SECRETS,
    get_secret,
    is_production,
    require_secret,
)


class SecretsLoaderTests(unittest.TestCase):
    def setUp(self):
        self._env = os.environ.copy()

    def tearDown(self):
        os.environ.clear()
        os.environ.update(self._env)

    def test_env_resolution(self):
        os.environ.pop("FLASK_ENV", None)
        os.environ.pop("ENV", None)
        os.environ["MY_SECRET"] = "from-env"
        self.assertEqual(get_secret("MY_SECRET"), "from-env")

    def test_file_resolution(self):
        os.environ.pop("FLASK_ENV", None)
        os.environ.pop("ENV", None)
        os.environ.pop("FILE_SECRET", None)
        with tempfile.NamedTemporaryFile("w", delete=False) as fh:
            fh.write("from-file\n")
            path = fh.name
        try:
            os.environ["FILE_SECRET_FILE"] = path
            self.assertEqual(get_secret("FILE_SECRET"), "from-file")
        finally:
            Path(path).unlink(missing_ok=True)

    def test_env_takes_precedence_over_file(self):
        os.environ.pop("FLASK_ENV", None)
        os.environ["BOTH"] = "env-wins"
        os.environ["BOTH_FILE"] = "/nonexistent"
        self.assertEqual(get_secret("BOTH"), "env-wins")

    def test_development_default(self):
        os.environ.pop("FLASK_ENV", None)
        os.environ.pop("ENV", None)
        os.environ.pop("OPTIONAL", None)
        self.assertEqual(get_secret("OPTIONAL", default="dev-default"), "dev-default")

    def test_production_missing_required_raises(self):
        os.environ["FLASK_ENV"] = "production"
        os.environ.pop("MUST_HAVE", None)
        os.environ.pop("MUST_HAVE_FILE", None)
        with self.assertRaises(RuntimeError):
            get_secret("MUST_HAVE", required=True)

    def test_production_rejects_known_dev_secret(self):
        os.environ["FLASK_ENV"] = "production"
        os.environ["BEARER_TOKEN"] = "local-dev-bearer-token"
        self.assertIn("local-dev-bearer-token", KNOWN_DEVELOPMENT_SECRETS)
        with self.assertRaises(RuntimeError):
            get_secret("BEARER_TOKEN")

    def test_is_production(self):
        os.environ["FLASK_ENV"] = "production"
        self.assertTrue(is_production())
        os.environ["FLASK_ENV"] = "development"
        self.assertFalse(is_production())

    def test_require_secret(self):
        os.environ.pop("FLASK_ENV", None)
        os.environ["REQ"] = "present"
        self.assertEqual(require_secret("REQ"), "present")


if __name__ == "__main__":
    unittest.main(verbosity=2)
