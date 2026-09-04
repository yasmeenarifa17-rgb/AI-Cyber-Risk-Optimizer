"""
Auth + Organization routers.

Endpoints:
    POST /api/auth/register
    POST /api/auth/login
    GET  /api/auth/me
    POST /api/auth/logout   (client-side; backend returns 200)
    GET  /api/organization
    PUT  /api/organization
"""

import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from passlib.context import CryptContext
from pydantic import BaseModel, EmailStr

from .database import get_db
from .dependencies import require_auth
from .tokens import create_access_token

router = APIRouter()
pwd_ctx = CryptContext(schemes=["bcrypt"], deprecated="auto")


# ── Pydantic models ─────────────────────────────────────────────────────────

class RegisterRequest(BaseModel):
    name: str
    email: EmailStr
    password: str
    organization_name: str
    organization_type: str = "Enterprise"


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class OrgUpdateRequest(BaseModel):
    organization_name: str | None = None
    organization_type: str | None = None


# ── Helpers ──────────────────────────────────────────────────────────────────

def _safe_user(u: dict) -> dict:
    """Strip internal Mongo _id and password_hash before returning to client."""
    return {
        "user_id": u["user_id"],
        "name": u["name"],
        "email": u["email"],
        "organization_id": u["organization_id"],
        "created_at": u["created_at"],
    }


def _safe_org(o: dict) -> dict:
    return {
        "organization_id": o["organization_id"],
        "organization_name": o["organization_name"],
        "organization_type": o["organization_type"],
        "created_at": o["created_at"],
    }


# ── Auth endpoints ────────────────────────────────────────────────────────────

@router.post("/api/auth/register", status_code=201)
async def register(req: RegisterRequest):
    db = get_db()

    existing = await db.users.find_one({"email": req.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    now = datetime.now(timezone.utc).isoformat()
    org_id = str(uuid.uuid4())
    user_id = str(uuid.uuid4())

    org = {
        "organization_id": org_id,
        "organization_name": req.organization_name,
        "organization_type": req.organization_type,
        "created_at": now,
    }
    await db.organizations.insert_one(org)

    user = {
        "user_id": user_id,
        "name": req.name,
        "email": req.email,
        "password_hash": pwd_ctx.hash(req.password),
        "organization_id": org_id,
        "created_at": now,
    }
    await db.users.insert_one(user)

    token = create_access_token({"sub": user_id})
    return {"token": token, "user": _safe_user(user), "organization": _safe_org(org)}


@router.post("/api/auth/login")
async def login(req: LoginRequest):
    db = get_db()

    user = await db.users.find_one({"email": req.email})
    if not user or not pwd_ctx.verify(req.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    org = await db.organizations.find_one({"organization_id": user["organization_id"]})

    token = create_access_token({"sub": user["user_id"]})
    return {"token": token, "user": _safe_user(user), "organization": _safe_org(org)}


@router.get("/api/auth/me")
async def me(current_user: dict = Depends(require_auth)):
    db = get_db()
    org = await db.organizations.find_one(
        {"organization_id": current_user["organization_id"]}
    )
    return {"user": _safe_user(current_user), "organization": _safe_org(org)}


@router.post("/api/auth/logout")
async def logout():
    # JWT is stateless; logout is handled client-side by discarding the token.
    return {"message": "Logged out"}


# ── Organization endpoints ────────────────────────────────────────────────────

@router.get("/api/organization")
async def get_organization(current_user: dict = Depends(require_auth)):
    db = get_db()
    org = await db.organizations.find_one(
        {"organization_id": current_user["organization_id"]}
    )
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")
    return _safe_org(org)


@router.put("/api/organization")
async def update_organization(
    req: OrgUpdateRequest,
    current_user: dict = Depends(require_auth),
):
    db = get_db()
    updates: dict = {}
    if req.organization_name is not None:
        updates["organization_name"] = req.organization_name
    if req.organization_type is not None:
        updates["organization_type"] = req.organization_type

    if updates:
        await db.organizations.update_one(
            {"organization_id": current_user["organization_id"]},
            {"$set": updates},
        )

    org = await db.organizations.find_one(
        {"organization_id": current_user["organization_id"]}
    )
    return _safe_org(org)
