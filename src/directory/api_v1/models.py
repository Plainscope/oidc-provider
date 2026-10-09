"""Shared typed models for the versioned Directory API contract."""
from __future__ import annotations

from typing import Any, Generic, TypeVar
from pydantic import BaseModel, ConfigDict, Field

T = TypeVar("T")


class ApiModel(BaseModel):
    """Base model with strict, documented JSON serialization behavior."""
    model_config = ConfigDict(extra="forbid", from_attributes=True)


class HealthResponse(ApiModel):
    status: str = Field(description="Service health status", examples=["healthy"])


class PaginationMeta(ApiModel):
    page: int = Field(ge=1)
    per_page: int = Field(ge=1, le=100)
    total: int = Field(ge=0)
    pages: int = Field(ge=0)


class PageLinks(ApiModel):
    self: str
    first: str
    last: str
    next: str | None = None
    prev: str | None = None


class PageResponse(ApiModel, Generic[T]):
    data: list[T]
    meta: PaginationMeta
    links: PageLinks


class ProblemDetail(ApiModel):
    """RFC 9457 Problem Details representation."""
    type: str = "about:blank"
    title: str
    status: int = Field(ge=400, le=599)
    detail: str | None = None
    instance: str | None = None
    errors: list[dict[str, Any]] | None = None


class DomainCreate(ApiModel):
    name: str = Field(min_length=1, max_length=255)
    description: str = Field(default="", max_length=2000)
    is_default: bool = False


class DomainResponse(ApiModel):
    id: str
    name: str
    description: str = ""
    is_default: bool = False


class UserCreate(ApiModel):
    username: str | None = Field(default=None, max_length=255)
    email: str = Field(min_length=3, max_length=320)
    password: str = Field(min_length=1, repr=False)
    first_name: str | None = Field(default=None, max_length=255)
    last_name: str | None = Field(default=None, max_length=255)


class UserResponse(ApiModel):
    id: str
    email: str | None = None
    username: str | None = None
    first_name: str | None = None
    last_name: str | None = None


class RoleResponse(ApiModel):
    id: str
    name: str
    description: str | None = None


class GroupResponse(ApiModel):
    id: str
    name: str
    description: str | None = None


class PropertyKeyResponse(ApiModel):
    id: str
    name: str
    value_type: str | None = None


class AuditLogResponse(ApiModel):
    id: str
    entity_type: str
    entity_id: str
    action: str
    created_at: str | None = None
