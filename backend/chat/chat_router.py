"""
POST /api/chat

Calls the Hugging Face Inference API with a system prompt that includes
the authenticated organization's real risk context, then returns the
assistant's reply.

Required env vars:
    HF_API_TOKEN  — Hugging Face API token (hf_...)
    HF_MODEL      — model repo e.g. mistralai/Mixtral-8x7B-Instruct-v0.1
"""

import os

import httpx
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from auth.dependencies import require_auth
from auth.database import get_db

router = APIRouter()

HF_TOKEN = os.getenv("HF_API_TOKEN", "")
HF_MODEL = os.getenv("HF_MODEL", "mistralai/Mixtral-8x7B-Instruct-v0.1")
HF_URL = f"https://api-inference.huggingface.co/models/{HF_MODEL}"

SYSTEM_PROMPT = """You are a cybersecurity assistant for an AI Cyber Risk Optimizer platform used by organisations.
You help security teams understand their risk scores, financial exposure, and what actions to take.
Always be concise, practical, and specific. Reference the organisation context provided when answering.
Do not invent organisation-specific numbers that are not in the context."""


class ChatRequest(BaseModel):
    message: str


def _build_org_context(org: dict | None, user: dict) -> str:
    if not org:
        return ""
    return (
        f"Organisation: {org.get('organization_name', 'Unknown')} "
        f"({org.get('organization_type', 'Enterprise')}). "
        f"User: {user.get('name', 'Unknown')}."
    )


def _build_prompt(message: str, org_context: str) -> str:
    """Build an instruct-style prompt compatible with Mixtral/Llama models."""
    context_block = f"\n[Organisation context: {org_context}]" if org_context else ""
    return (
        f"<s>[INST] {SYSTEM_PROMPT}{context_block}\n\n"
        f"User question: {message} [/INST]"
    )


@router.post("/api/chat")
async def chat(req: ChatRequest, current_user: dict = Depends(require_auth)):
    if not HF_TOKEN:
        raise HTTPException(
            status_code=503,
            detail="AI assistant not configured. Set HF_API_TOKEN environment variable.",
        )

    # Fetch organisation to provide real context
    try:
        db = get_db()
        org = await db.organizations.find_one(
            {"organization_id": current_user["organization_id"]}
        )
    except RuntimeError:
        org = None

    org_context = _build_org_context(org, current_user)
    prompt = _build_prompt(req.message, org_context)

    payload = {
        "inputs": prompt,
        "parameters": {
            "max_new_tokens": 350,
            "temperature": 0.4,
            "return_full_text": False,
        },
    }

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                HF_URL,
                json=payload,
                headers={"Authorization": f"Bearer {HF_TOKEN}"},
            )
            response.raise_for_status()
            data = response.json()
    except httpx.HTTPStatusError as exc:
        raise HTTPException(
            status_code=502,
            detail=f"AI provider returned {exc.response.status_code}: {exc.response.text[:200]}",
        )
    except httpx.RequestError as exc:
        raise HTTPException(status_code=502, detail=f"AI provider unreachable: {exc}")

    # HF inference API returns [{"generated_text": "..."}]
    if isinstance(data, list) and data:
        reply = data[0].get("generated_text", "").strip()
    elif isinstance(data, dict):
        reply = data.get("generated_text", str(data)).strip()
    else:
        reply = str(data).strip()

    if not reply:
        raise HTTPException(status_code=502, detail="Empty response from AI provider")

    return {"reply": reply}
