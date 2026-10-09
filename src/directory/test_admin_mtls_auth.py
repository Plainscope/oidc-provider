#!/usr/bin/env python3
"""Tests for admin auth (#53) and mTLS mapping (#54)."""
from __future__ import annotations

import os
import sys
import unittest

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from admin_auth import admin_session_payload, get_admin_token, validate_admin_token  # noqa: E402
from mtls_auth import enforce_mtls, extract_mtls_identity, mtls_required  # noqa: E402


class AdminAuthTests(unittest.TestCase):
    def setUp(self):
        self._env = os.environ.copy()

    def tearDown(self):
        os.environ.clear()
        os.environ.update(self._env)

    def test_admin_token_preferred(self):
        os.environ.pop("FLASK_ENV", None)
        os.environ["DIRECTORY_ADMIN_TOKEN"] = "admin-only-token"
        os.environ["BEARER_TOKEN"] = "local-dev-bearer-token"
        self.assertEqual(get_admin_token(), "admin-only-token")
        self.assertTrue(validate_admin_token("admin-only-token"))
        self.assertFalse(validate_admin_token("local-dev-bearer-token"))

    def test_admin_falls_back_to_bearer(self):
        os.environ.pop("FLASK_ENV", None)
        os.environ.pop("DIRECTORY_ADMIN_TOKEN", None)
        os.environ.pop("DIRECTORY_ADMIN_TOKEN_FILE", None)
        os.environ["BEARER_TOKEN"] = "local-dev-bearer-token"
        self.assertEqual(get_admin_token(), "local-dev-bearer-token")
        self.assertTrue(validate_admin_token("local-dev-bearer-token"))

    def test_session_payload_omits_token(self):
        payload = admin_session_payload("alice")
        self.assertTrue(payload["authenticated"])
        self.assertEqual(payload["role"], "admin")
        self.assertEqual(payload["username"], "alice")
        self.assertNotIn("token", payload)


class MtlsAuthTests(unittest.TestCase):
    def setUp(self):
        self._env = os.environ.copy()
        for k in list(os.environ):
            if k.startswith("MTLS_"):
                os.environ.pop(k, None)

    def tearDown(self):
        os.environ.clear()
        os.environ.update(self._env)

    def test_extract_verified(self):
        ident = extract_mtls_identity(
            {
                "X-SSL-Client-Verify": "SUCCESS",
                "X-SSL-Client-S-DN": "CN=provider,O=Example",
            }
        )
        self.assertTrue(ident.verified)
        self.assertEqual(ident.subject, "CN=provider,O=Example")

    def test_required_rejects_unverified(self):
        os.environ["MTLS_REQUIRED"] = "true"
        self.assertTrue(mtls_required())
        self.assertIsNone(enforce_mtls({"X-SSL-Client-Verify": "NONE"}))

    def test_required_accepts_verified(self):
        os.environ["MTLS_REQUIRED"] = "true"
        ident = enforce_mtls(
            {
                "X-SSL-Client-Verify": "SUCCESS",
                "X-SSL-Client-S-DN": "CN=provider",
            }
        )
        self.assertIsNotNone(ident)
        self.assertTrue(ident.verified)

    def test_optional_by_default(self):
        self.assertFalse(mtls_required())
        ident = enforce_mtls({})
        self.assertIsNotNone(ident)
        self.assertFalse(ident.verified)


if __name__ == "__main__":
    unittest.main(verbosity=2)
