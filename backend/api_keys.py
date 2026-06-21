"""API-key registry for the Commercial Fleet Quarantine API.

Fleets authenticate to the B2B broadcast with an `X-API-Key` header. This is a
lightweight in-memory issuer so the developer-docs page can demo the *real*
flow end-to-end: generate a key, call the endpoint with it, and get a genuine
401 when the key is missing or wrong.

In-memory only by design (no DB dependency, demo-safe). Keys seeded at import
time are stable across a server run; generated keys live until the process
restarts.
"""
from __future__ import annotations

import secrets
from datetime import datetime, timezone

_KEY_PREFIX = "glk_live_"


def _new_secret() -> str:
    return _KEY_PREFIX + secrets.token_hex(12)


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


# Seed a few realistic partner keys so the docs page has something to show and
# the demo works the instant the server boots. The first one is the headline
# "sandbox" key documented in the code samples.
_REGISTRY: dict[str, dict] = {
    "glk_live_demo_5f3b9c2a8e1d": {
        "name": "Sandbox",
        "fleet": "Gridlock Demo",
        "created_at": "2024-03-01T00:00:00+00:00",
        "seeded": True,
    },
    "glk_live_7d4a1f9c3b6e2a8d": {
        "name": "Production",
        "fleet": "Flipkart Logistics",
        "created_at": "2024-03-01T00:00:00+00:00",
        "seeded": True,
    },
    "glk_live_2c8e5b1a9f4d7c3b": {
        "name": "Dispatch",
        "fleet": "Swiggy Instamart",
        "created_at": "2024-03-01T00:00:00+00:00",
        "seeded": True,
    },
}

# Back-compat: the original prototype documented this literal key.
_LEGACY_KEYS = {"demo-fleet-key"}


def is_valid(key: str | None) -> bool:
    """True if the key was issued by us (seeded, generated, or legacy)."""
    if not key:
        return False
    return key in _REGISTRY or key in _LEGACY_KEYS


def _mask(key: str) -> str:
    """Show enough to recognise a key without exposing the whole secret."""
    if len(key) <= 12:
        return key
    return f"{key[:12]}…{key[-4:]}"


def issue_key(name: str = "Untitled", fleet: str = "Custom") -> dict:
    """Mint a brand-new working API key and register it."""
    key = _new_secret()
    record = {
        "name": (name or "Untitled").strip()[:40],
        "fleet": (fleet or "Custom").strip()[:40],
        "created_at": _now_iso(),
        "seeded": False,
    }
    _REGISTRY[key] = record
    # On creation we return the full secret — the only time it's shown in full.
    return {"key": key, **record}


def list_keys() -> list[dict]:
    """Issued keys, newest first, with the secret masked for display."""
    items = [
        {
            "key": key,
            "masked": _mask(key),
            "name": rec["name"],
            "fleet": rec["fleet"],
            "created_at": rec["created_at"],
            "seeded": rec["seeded"],
        }
        for key, rec in _REGISTRY.items()
    ]
    # seeded first (stable), then generated newest-first
    items.sort(key=lambda i: (not i["seeded"], i["created_at"]), reverse=False)
    return items
