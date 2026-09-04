"""
JWT token helpers.

Required env vars:
    JWT_SECRET          — long random string
    JWT_ALGORITHM       — default HS256
    JWT_EXPIRE_MINUTES  — default 1440 (24 h)
"""

import os
from datetime import datetime, timedelta, timezone

from jose import JWTError, jwt  # noqa: F401 — re-exported for dependencies.py


def _secret() -> str:
    return os.getenv("JWT_SECRET", "INSECURE_DEFAULT_CHANGE_ME")


def _algorithm() -> str:
    return os.getenv("JWT_ALGORITHM", "HS256")


def _expire_minutes() -> int:
    return int(os.getenv("JWT_EXPIRE_MINUTES", "1440"))


def create_access_token(data: dict) -> str:
    payload = data.copy()
    payload["exp"] = datetime.now(timezone.utc) + timedelta(minutes=_expire_minutes())
    return jwt.encode(payload, _secret(), algorithm=_algorithm())


def decode_token(token: str) -> dict:
    """Raises JWTError if invalid or expired."""
    return jwt.decode(token, _secret(), algorithms=[_algorithm()])
