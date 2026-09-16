import os
from motor.motor_asyncio import AsyncIOMotorClient

_client = None
_db = None


# ── In-memory fallback for demo when Atlas is unreachable ────────────────────

class _MemoryCollection:
    """Minimal async-compatible MongoDB collection substitute for demo use."""

    def __init__(self):
        self._docs = []

    async def find_one(self, query: dict):
        for doc in self._docs:
            if self._matches(doc, query):
                return dict(doc)
        return None

    async def insert_one(self, doc: dict):
        self._docs.append(dict(doc))

    async def update_one(self, query: dict, update: dict):
        for doc in self._docs:
            if self._matches(doc, query):
                if "$set" in update:
                    doc.update(update["$set"])
                break

    def _matches(self, doc, query):
        for k, v in query.items():
            if doc.get(k) != v:
                return False
        return True


class _MemoryDB:
    """Minimal in-memory database stub."""

    def __init__(self):
        self.users = _MemoryCollection()
        self.organizations = _MemoryCollection()
        self.assessments = _MemoryCollection()

    def __getitem__(self, name):
        if not hasattr(self, name):
            setattr(self, name, _MemoryCollection())
        return getattr(self, name)


_DEMO_MODE = False  # Set True when Atlas is unreachable


async def connect_db():
    global _client, _db, _DEMO_MODE

    mongodb_uri = os.getenv("MONGODB_URI")

    if not mongodb_uri:
        raise RuntimeError("MONGODB_URI is not configured in backend/.env")

    if mongodb_uri.startswith("mongodb://"):
        seed_hosts = mongodb_uri.split("://", 1)[1].split("/", 1)[0].rsplit("@", 1)[-1]
        is_ip_seed_list = all(
            host.rsplit(":", 1)[0].replace("[", "").replace("]", "").replace(".", "").isdigit()
            for host in seed_hosts.split(",")
        )
        if is_ip_seed_list and "tls=true" in mongodb_uri.lower() and "atlas-" in mongodb_uri.lower():
            print("[WARN] Atlas raw-IP URI detected; TLS/SNI may fail. Use the mongodb+srv hostname for persistence.")

    if mongodb_uri.startswith("mongodb+srv://"):
        dns_servers = [
            server.strip()
            for server in os.getenv("MONGODB_DNS_SERVERS", "").split(",")
            if server.strip()
        ]
        if dns_servers:
            import dns.resolver

            # Ensure the default resolver is initialised before mutating it
            if dns.resolver.default_resolver is None:
                dns.resolver.default_resolver = dns.resolver.Resolver()
            dns.resolver.default_resolver.nameservers = dns_servers

    try:
        _client = AsyncIOMotorClient(
            mongodb_uri,
            serverSelectionTimeoutMS=8000,
            connectTimeoutMS=8000,
        )

        # Explicit database name
        _db = _client["cyberrisk"]

        # Verify MongoDB connection
        await _client.admin.command("ping")

        _DEMO_MODE = False
        print("[OK] MongoDB connected (Atlas).")

    except Exception as exc:
        # Atlas unreachable (IP not whitelisted, network issue, etc.)
        # Fall back to in-memory store so the demo can run end-to-end.
        print(f"[WARN] MongoDB Atlas unavailable ({exc.__class__.__name__}: {str(exc)[:120]})")
        print("[WARN] Falling back to IN-MEMORY demo database.")
        print("[WARN] Data will NOT persist between restarts. Add current IP to Atlas Access List for production.")
        if _client:
            try:
                _client.close()
            except Exception:
                pass
        _client = None
        _db = _MemoryDB()
        _DEMO_MODE = True


async def close_db():
    global _client, _db

    if _client:
        _client.close()
        _client = None
    _db = None
    print("MongoDB connection closed.")


def get_db():
    if _db is None:
        raise RuntimeError("MongoDB database is not initialized.")

    return _db


def is_demo_mode() -> bool:
    return _DEMO_MODE
