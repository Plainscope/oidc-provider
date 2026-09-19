#!/usr/bin/env python3
"""Tests for JWT + static Bearer service authentication (issue #52)."""
from __future__ import annotations

import os
import sys
import time
import unittest

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from cryptography.hazmat.primitives.asymmetric import rsa
from cryptography.hazmat.primitives import serialization
import jwt

from service_auth import (  # noqa: E402
    authenticate_service_token,
    jwt_auth_configured,
    validate_service_jwt,
    validate_static_bearer,
)


def _rsa_pair():
    key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    priv = key.private_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PrivateFormat.PKCS8,
        encryption_algorithm=serialization.NoEncryption(),
    ).decode()
    pub = key.public_key().public_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PublicFormat.SubjectPublicKeyInfo,
    ).decode()
    return priv, pub


class ServiceAuthTests(unittest.TestCase):
    def setUp(self):
        self._env = os.environ.copy()
        for k in list(os.environ):
            if k.startswith("SERVICE_JWT") or k == "BEARER_TOKEN":
                os.environ.pop(k, None)

    def tearDown(self):
        os.environ.clear()
        os.environ.update(self._env)

    def test_static_bearer_ok(self):
        ident = validate_static_bearer("local-dev-bearer-token", "local-dev-bearer-token")
        self.assertIsNotNone(ident)
        self.assertEqual(ident.method, "bearer")

    def test_static_bearer_reject(self):
        self.assertIsNone(validate_static_bearer("wrong", "local-dev-bearer-token"))

    def test_jwt_not_configured(self):
        self.assertFalse(jwt_auth_configured())

    def test_jwt_valid(self):
        priv, pub = _rsa_pair()
        os.environ["SERVICE_JWT_ISSUER"] = "https://issuer.example"
        os.environ["SERVICE_JWT_AUDIENCE"] = "directory-api"
        os.environ["SERVICE_JWT_PUBLIC_KEY"] = pub
        token = jwt.encode(
            {
                "iss": "https://issuer.example",
                "aud": "directory-api",
                "sub": "provider-1",
                "iat": int(time.time()),
                "exp": int(time.time()) + 300,
            },
            priv,
            algorithm="RS256",
        )
        ident = validate_service_jwt(token)
        self.assertIsNotNone(ident)
        self.assertEqual(ident.actor, "provider-1")
        self.assertEqual(ident.method, "jwt")

    def test_jwt_rejects_bad_audience(self):
        priv, pub = _rsa_pair()
        os.environ["SERVICE_JWT_ISSUER"] = "https://issuer.example"
        os.environ["SERVICE_JWT_AUDIENCE"] = "directory-api"
        os.environ["SERVICE_JWT_PUBLIC_KEY"] = pub
        token = jwt.encode(
            {
                "iss": "https://issuer.example",
                "aud": "wrong-aud",
                "sub": "provider-1",
                "iat": int(time.time()),
                "exp": int(time.time()) + 300,
            },
            priv,
            algorithm="RS256",
        )
        self.assertIsNone(validate_service_jwt(token))

    def test_jwt_rejects_expired(self):
        priv, pub = _rsa_pair()
        os.environ["SERVICE_JWT_ISSUER"] = "https://issuer.example"
        os.environ["SERVICE_JWT_AUDIENCE"] = "directory-api"
        os.environ["SERVICE_JWT_PUBLIC_KEY"] = pub
        token = jwt.encode(
            {
                "iss": "https://issuer.example",
                "aud": "directory-api",
                "sub": "provider-1",
                "iat": int(time.time()) - 600,
                "exp": int(time.time()) - 60,
            },
            priv,
            algorithm="RS256",
        )
        self.assertIsNone(validate_service_jwt(token))

    def test_authenticate_prefers_jwt_shape(self):
        priv, pub = _rsa_pair()
        os.environ["SERVICE_JWT_ISSUER"] = "https://issuer.example"
        os.environ["SERVICE_JWT_AUDIENCE"] = "directory-api"
        os.environ["SERVICE_JWT_PUBLIC_KEY"] = pub
        os.environ["BEARER_TOKEN"] = "local-dev-bearer-token"
        bad_jwt = jwt.encode(
            {
                "iss": "https://issuer.example",
                "aud": "wrong",
                "sub": "x",
                "iat": int(time.time()),
                "exp": int(time.time()) + 300,
            },
            priv,
            algorithm="RS256",
        )
        self.assertIsNone(authenticate_service_token(bad_jwt, "local-dev-bearer-token"))
        ident = authenticate_service_token("local-dev-bearer-token", "local-dev-bearer-token")
        self.assertIsNotNone(ident)
        self.assertEqual(ident.method, "bearer")


if __name__ == "__main__":
    unittest.main(verbosity=2)
