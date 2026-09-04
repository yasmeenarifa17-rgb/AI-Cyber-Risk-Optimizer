"""
Database connection — Motor (async MongoDB driver).

Required environment variable:
    MONGODB_URI  e.g. mongodb://localhost:27017/cyberrisk
                 or   mongodb+srv://user:pass@cluster.mongodb.net/cyberrisk

If MONGODB_URI is not set the application still starts but every DB call
will raise a RuntimeError with a clear message.
"""

import os
from motor.motor_asyncio import AsyncIOMotorClient

_client: AsyncIOMotorClient | None = None


def get_db():
    """Return the 'cyberrisk' database handle. Raises if not connected."""
    if _client is None:
        raise RuntimeError(
            "Database not connected. Set MONGODB_URI environment variable "
            "and ensure connect_db() was awaited at startup."
        )
    return _client.get_default_database()


async def connect_db():
    """Call once at application startup."""
    global _client
    uri = os.getenv("MONGODB_URI")
    if not uri:
        print(
            "WARNING: MONGODB_URI not set. "
            "Auth and org endpoints will be unavailable until it is configured."
        )
        return
    _client = AsyncIOMotorClient(uri)
    # Ping to verify the connection works
    await _client.admin.command("ping")
    print("MongoDB connected.")


async def close_db():
    """Call once at application shutdown."""
    global _client
    if _client:
        _client.close()
        _client = None
