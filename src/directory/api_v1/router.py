"""Versioned resource route declarations for the Directory API.

Resource persistence/behavior is deliberately completed in Phase 2. These explicit
routes make the Phase 1 OpenAPI surface reviewable without pretending to implement
operations or silently proxying v1 requests to legacy Flask handlers.
"""
from fastapi import APIRouter, Depends, Request
from fastapi.responses import JSONResponse

from .dependencies import require_admin_auth, require_provider_auth
from .models import HealthResponse, ProblemDetail

router = APIRouter(prefix="/api/v1")


def _not_implemented(request: Request) -> JSONResponse:
    problem = ProblemDetail(
        type="about:blank",
        title="Not Implemented",
        status=501,
        detail="This versioned operation is declared but its resource behavior is scheduled for Phase 2.",
        instance=request.url.path,
    )
    return JSONResponse(status_code=501, content=problem.model_dump(exclude_none=True), media_type="application/problem+json")


@router.get("/health", response_model=HealthResponse, tags=["health"])
async def health() -> HealthResponse:
    """Public liveness endpoint; it exposes no configuration or persistence details."""
    return HealthResponse(status="healthy")


# Administrative CRUD surface. Auth is enforced even while the handlers are placeholders.
admin = APIRouter(dependencies=[Depends(require_admin_auth)])
for resource, tag in (
    ("domains", "domains"),
    ("users", "users"),
    ("roles", "roles"),
    ("groups", "groups"),
    ("property-keys", "property-keys"),
    ("audit-logs", "audit-logs"),
):
    async def list_resource(request: Request):
        return _not_implemented(request)

    async def create_resource(request: Request):
        return _not_implemented(request)

    admin.add_api_route(f"/{resource}", list_resource, methods=["GET"], tags=[tag], name=f"list_{resource.replace('-', '_')}", summary=f"List {resource}")
    if resource != "audit-logs":
        admin.add_api_route(f"/{resource}", create_resource, methods=["POST"], tags=[tag], name=f"create_{resource.replace('-', '_')}", summary=f"Create {resource}")
    if resource not in ("roles", "groups", "audit-logs"):
        async def get_resource(resource_id: str, request: Request):
            return _not_implemented(request)

        async def patch_resource(resource_id: str, request: Request):
            return _not_implemented(request)

        async def delete_resource(resource_id: str, request: Request):
            return _not_implemented(request)

        admin.add_api_route(f"/{resource}/{{resource_id}}", get_resource, methods=["GET"], tags=[tag], name=f"get_{resource.replace('-', '_')}", summary=f"Get {resource} by ID")
        admin.add_api_route(f"/{resource}/{{resource_id}}", patch_resource, methods=["PATCH"], tags=[tag], name=f"patch_{resource.replace('-', '_')}", summary=f"Update {resource}")
        admin.add_api_route(f"/{resource}/{{resource_id}}", delete_resource, methods=["DELETE"], tags=[tag], name=f"delete_{resource.replace('-', '_')}", summary=f"Delete {resource}")
router.include_router(admin)


# Provider-facing user relationships retain their own machine-to-machine auth policy.
provider = APIRouter(prefix="/users/{user_id}", dependencies=[Depends(require_provider_auth)])

@provider.get("/emails", tags=["users"], summary="List a user's email addresses")
async def user_emails(user_id: str, request: Request):
    return _not_implemented(request)

@provider.get("/roles", tags=["users"], summary="List a user's roles")
async def user_roles(user_id: str, request: Request):
    return _not_implemented(request)

@provider.put("/roles", tags=["users"], summary="Replace a user's role assignments")
async def replace_user_roles(user_id: str, request: Request):
    return _not_implemented(request)

@provider.get("/groups", tags=["users"], summary="List a user's groups")
async def user_groups(user_id: str, request: Request):
    return _not_implemented(request)

router.include_router(provider)


@router.api_route("/{path:path}", methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS", "HEAD"], include_in_schema=False)
async def unknown_v1_path(path: str, request: Request):
    """Prevent unknown v1 paths falling through to the legacy Flask mount."""
    problem = ProblemDetail(title="Not Found", status=404, detail="The requested API v1 resource does not exist.", instance=request.url.path)
    return JSONResponse(status_code=404, content=problem.model_dump(exclude_none=True), media_type="application/problem+json")
