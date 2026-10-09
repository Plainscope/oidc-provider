"""ASGI entrypoint for the versioned Directory API.

The existing Flask application remains available for the UI and legacy routes during
migration. Deployments can run this module with Uvicorn while Phase 2 ports resource
behavior and the migration gate in Plan 02 keeps legacy behavior intact.
"""
from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.middleware.wsgi import WSGIMiddleware

from api_v1.models import ProblemDetail
from api_v1.router import router as v1_router

app = FastAPI(
    title="Directory API",
    summary="Versioned Directory contract for Provider and administration clients",
    description=(
        "The Directory is a backing store; the Provider remains responsible for OIDC token issuance. "
        "Legacy Flask routes remain mounted during the verified migration window."
    ),
    version="1.0.0",
    openapi_url="/api/v1/openapi.json",
    docs_url="/api/v1/docs",
    redoc_url="/api/v1/redoc",
    openapi_tags=[
        {"name": "health", "description": "Unauthenticated liveness and readiness checks."},
        {"name": "domains", "description": "Directory domain resources."},
        {"name": "users", "description": "Directory user resources and relationships."},
        {"name": "roles", "description": "Role resources and assignments."},
        {"name": "groups", "description": "Group resources and membership."},
        {"name": "property-keys", "description": "Directory property key resources."},
        {"name": "audit-logs", "description": "Read-only audit history."},
    ],
)
app.include_router(v1_router)


@app.exception_handler(RequestValidationError)
async def validation_error_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
    problem = ProblemDetail(
        type="https://www.rfc-editor.org/rfc/rfc9457.html#name-client-error-4xx",
        title="Request validation failed",
        status=422,
        detail="One or more request fields are invalid.",
        instance=request.url.path,
        errors=[{"loc": list(error.get("loc", ())), "msg": error.get("msg", "Invalid value"), "type": error.get("type", "value_error")} for error in exc.errors()],
    )
    return JSONResponse(status_code=422, content=problem.model_dump(exclude_none=True), media_type="application/problem+json")


@app.exception_handler(404)
async def not_found_handler(request: Request, exc: Exception) -> JSONResponse:
    problem = ProblemDetail(title="Not Found", status=404, detail="The requested resource does not exist.", instance=request.url.path)
    return JSONResponse(status_code=404, content=problem.model_dump(exclude_none=True), media_type="application/problem+json")


# Keep the existing Flask UI and legacy API routes reachable until Provider migration
# and integration tests satisfy Plan 02's removal gate. API v1 routes take precedence.
try:
    from app import app as legacy_flask_app
except ImportError:
    legacy_flask_app = None

if legacy_flask_app is not None:
    app.mount("/", WSGIMiddleware(legacy_flask_app), name="legacy-directory")
