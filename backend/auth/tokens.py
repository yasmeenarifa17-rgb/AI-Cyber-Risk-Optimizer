"""
JWT token helpers.

Required env vars:
    JWT_SECRET          — long random string
    JWT_ALGORITHM       — default HS256
    JWT_EXPIRE_MINUTES  — default 1440 (24 h)
"""

import os
from datetime import datetime, timedelta, timezone

from jose import JWTError, jwt

SECRET = os.getenv("JWT_SECRET", "INSECURE_DEFAULT_CHANGE_ME")
ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
EXPIRE_MINUTES = int(os.getenv("JWT_EXPIRE_MINUTES", "1440"))


def create_access_token(data: dict) -> str:
    payload = data.copy()
    payload["exp"] = datetime.now(timezone.utc) + timedelta(minutes=EXPIRE_MINUTES)
    return jwt.encode(payload, SECRET, algorithm=ALGORITHM)


def decode_token(token: str) -> dict:
    """Raises JWTError if invalid or expired."""
    return jwt.decode(token, SECRET, algorithms=[ALGORITHM])
