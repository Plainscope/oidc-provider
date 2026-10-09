"""Versioned resource routes; resource behavior is implemented in Phase 2."""
from fastapi import APIRouter, Depends
from .dependencies import require_admin_auth, require_provider_auth
from .models import HealthResponse

router = APIRouter(prefix="/api/v1")

# Public liveness endpoint deliberately reveals no configuration or persistence details.
@router.get("/health", response_model=HealthResponse, tags=["health"])
async def health() -> HealthResponse:
    return HealthResponse(status="healthy")

# Declare resource namespaces now so the OpenAPI contract has stable, versioned paths.
# Operations are added alongside their typed models in Phase 2; routes are not silently
# redirected to legacy Flask endpoints because their payloads and error semantics differ.
for resource in ("domains", "users", "roles", "groups", "property-keys", "audit-logs"):
    protected = APIRouter(prefix=f"/{resource}", tags=[resource], dependencies=[Depends(require_provider_auth)])
    router.include_router(protected)
