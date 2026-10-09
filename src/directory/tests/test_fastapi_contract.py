"""Smoke tests for the FastAPI v1 app and generated contract."""
from fastapi.testclient import TestClient

from fastapi_app import app

client = TestClient(app)


def test_openapi_is_published_at_versioned_path():
    response = client.get("/api/v1/openapi.json")
    assert response.status_code == 200
    schema = response.json()
    assert schema["openapi"].startswith("3.")
    assert schema["info"]["version"] == "1.0.0"
    assert "/api/v1/health" in schema["paths"]


def test_interactive_docs_are_versioned():
    response = client.get("/api/v1/docs")
    assert response.status_code == 200
    assert "swagger-ui" in response.text.lower()


def test_health_is_public_and_typed():
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    assert response.json() == {"status": "healthy"}


def test_unknown_v1_path_returns_problem_details():
    response = client.get("/api/v1/not-a-resource")
    assert response.status_code == 404
    assert response.headers["content-type"].startswith("application/problem+json")
    body = response.json()
    assert body["status"] == 404
    assert body["title"] == "Not Found"
