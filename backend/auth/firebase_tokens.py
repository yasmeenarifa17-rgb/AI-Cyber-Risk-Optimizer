"""Verify Firebase ID tokens without exposing Admin credentials to the frontend."""

import os
import time
from typing import Any

import httpx
from jose import JWTError, jwt

_CERTS_URL = "https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com"
_certs: dict[str, str] = {}
_certs_expiry = 0.0


class FirebaseTokenError(ValueError):
    """Safe-to-log Firebase token verification failure."""

    def __init__(self, reason: str):
        super().__init__(reason)
        self.reason = reason


def _project_id() -> str:
    project_id = os.getenv("FIREBASE_PROJECT_ID", "").strip()
    if not project_id:
        raise RuntimeError("FIREBASE_PROJECT_ID is not configured")
    return project_id


async def _get_certs() -> dict[str, str]:
    global _certs, _certs_expiry
    if _certs and time.time() < _certs_expiry:
        return _certs
    async with httpx.AsyncClient(timeout=10.0) as client:
        response = await client.get(_CERTS_URL)
        response.raise_for_status()
        _certs = response.json()
        max_age = response.headers.get("cache-control", "")
        max_age_value = next((part.split("=", 1)[1] for part in max_age.split(", ") if part.startswith("max-age=")), "3600")
        _certs_expiry = time.time() + int(max_age_value)
        return _certs


async def verify_firebase_id_token(token: str) -> dict[str, Any]:
    if not token:
        raise FirebaseTokenError("missing token")
    try:
        header = jwt.get_unverified_header(token)
    except JWTError as exc:
        raise FirebaseTokenError("malformed token header") from exc
    key_id = header.get("kid")
    if not key_id:
        raise FirebaseTokenError("missing signing key")
    try:
        certs = await _get_certs()
    except httpx.HTTPError as exc:
        raise FirebaseTokenError("certificate retrieval failed") from exc
    certificate = certs.get(key_id)
    if not certificate:
        _certs.clear()
        try:
            certificate = (await _get_certs()).get(key_id)
        except httpx.HTTPError as exc:
            raise FirebaseTokenError("certificate refresh failed") from exc
    if not certificate:
        raise FirebaseTokenError("signing key unavailable")
    project_id = _project_id()
    try:
        return jwt.decode(
            token,
            certificate,
            algorithms=["RS256"],
            audience=project_id,
            issuer=f"https://securetoken.google.com/{project_id}",
            options={"require_exp": True, "require_iat": True, "require_sub": True},
        )
    except JWTError as exc:
        message = str(exc).lower()
        if "expired" in message:
            reason = "expired token"
        elif "audience" in message:
            reason = "wrong audience/project"
        elif "issuer" in message:
            reason = "wrong issuer"
        elif "signature" in message or "key" in message:
            reason = "invalid signature"
        else:
            reason = "invalid token claims"
        raise FirebaseTokenError(reason) from exc
