"""Authenticated, context-aware CyberRisk AI assistant."""

import os
from typing import Any
from uuid import uuid4

import httpx
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from auth.dependencies import require_auth
from auth.database import get_db

router = APIRouter()


MAX_HISTORY_MESSAGES = 12
GEMINI_MAX_OUTPUT_TOKENS = 4096


def _provider() -> str:
    return os.getenv("AI_PROVIDER", "gemini").strip().lower()


def _model() -> str:
    return os.getenv("AI_MODEL", "gemini-3.6-flash").strip()


def _api_key() -> str:
    provider = _provider()
    if provider == "openai":
        return os.getenv("OPENAI_API_KEY", "").strip()
    return os.getenv("GEMINI_API_KEY", "").strip()


def _provider_url() -> str:
    if _provider() == "openai":
        return os.getenv("OPENAI_BASE_URL", "https://api.openai.com/v1") + "/chat/completions"
    return f"https://generativelanguage.googleapis.com/v1beta/models/{_model()}:generateContent"


# ── System prompt ─────────────────────────────────────────────────────────────

SYSTEM_PROMPT = """You are CyberRisk AI, an intelligent cybersecurity decision-support assistant.

Use the organization's supplied context when relevant, but never invent organizational facts, systems,
incidents, vulnerabilities, tools, employee counts, or numerical results. If a requested fact is UNKNOWN,
say: "I don't have that information from your assessment yet." Then ask one targeted question.

The deterministic backend is authoritative for risk scores, financial estimates, recommendations,
optimization, and simulation. Explain those values but do not recalculate or modify them.
Distinguish threat status, vulnerability, exposure, baseline risk, calculated risk, and projected risk.
Answer general defensive cybersecurity questions normally. For incident questions, give authorized,
defensive steps and prioritize containment, evidence preservation, credential protection, and escalation.
Never claim access to live systems, logs, networks, or security tools. Use simple language when useful.
Answer the user's actual question completely. Do not stop mid-sentence or leave the response unfinished.
Prefer concise, well-structured answers that fit within the available response budget. Avoid unnecessary repetition.
Be concise but practical.
"""

CITIZEN_SYSTEM_PROMPT = """You are CyberRisk AI Citizen Safety Assistant.

Help users assess suspicious SMS, email, WhatsApp, social media, and web links. Focus on phishing, scam,
credential theft, OTP fraud, fake QR codes, and account takeover warnings. Give practical next steps:
- do not click unknown links
- do not share passwords or one-time codes
- verify using official apps or phone numbers rather than the message itself
- report and block suspicious senders
- contact their bank, workplace, or service provider if the message appears linked to a real account

Never claim to know the user's personal accounts, bank balances, or login status. Do not request or store
passwords, OTPs, payment card numbers, Aadhaar numbers, PAN numbers, or other highly sensitive personal data.
If a situation is urgent, prioritize safe verification and containment. Use short, clear guidance and explain
uncertainty honestly. Provide no certainty guarantees about whether a link or message is safe.
"""


def _build_context(user: dict, org: dict | None, assessment_doc: dict | None) -> str:
    """Build a structured context block from real data. Mark missing fields as UNKNOWN."""

    lines = []

    # Organization basics
    if org:
        lines.append(f"Organization: {org.get('organization_name', 'UNKNOWN')}")
        lines.append(f"Organization type: {org.get('organization_type', 'UNKNOWN')}")
    else:
        lines.append("Organization: UNKNOWN")

    # Assessment
    if assessment_doc and assessment_doc.get("assessment"):
        a = assessment_doc["assessment"]
        r = assessment_doc.get("result", {})

        emp = a.get("employee_count")
        lines.append(f"Employees: {emp if emp is not None else 'UNKNOWN'}")
        lines.append(f"Sector: {a.get('sector', 'UNKNOWN')}")
        lines.append(f"Organization size: {a.get('org_size', 'UNKNOWN')}")
        lines.append(f"Critical assets: {a.get('critical_assets', 'UNKNOWN')}")
        lines.append(f"Security budget: {'Rs.' + str(a.get('security_budget_lakhs')) + ' lakh' if a.get('security_budget_lakhs') is not None else 'UNKNOWN'}")
        lines.append(f"Internet-facing systems: {a.get('internet_facing_systems', 'UNKNOWN')}")
        lines.append(f"Public web portals: {a.get('web_portals', 'UNKNOWN')}")
        lines.append(f"Critical databases: {a.get('critical_databases', 'UNKNOWN')}")
        lines.append(f"Cloud usage: {a.get('cloud_usage', 'UNKNOWN')}")
        lines.append(f"Remote workers: {a.get('remote_workers', 'UNKNOWN')}")
        lines.append(f"MFA: {a.get('mfa', 'UNKNOWN')}")
        lines.append(f"Endpoint protection: {a.get('endpoint_protection', 'UNKNOWN')}")
        lines.append(f"Firewall/WAF: {a.get('firewall_waf', 'UNKNOWN')}")
        lines.append(f"Backup: {a.get('backup', 'UNKNOWN')}")
        lines.append(f"Security awareness training: {a.get('security_awareness', 'UNKNOWN')}")
        lines.append(f"Vulnerability patching: {a.get('patching', 'UNKNOWN')}")
        lines.append(f"Incident response plan: {a.get('incident_response', 'UNKNOWN')}")
        lines.append(f"Recent security incident: {a.get('recent_incident', 'UNKNOWN')}")
        lines.append(f"Active threat detected: {a.get('active_threat', 'UNKNOWN')}")
        lines.append(f"Threat type: {a.get('threat_type', 'UNKNOWN')}")
        lines.append(f"Affected asset: {a.get('affected_asset', 'UNKNOWN')}")
        lines.append(f"Threat severity: {a.get('threat_severity', 'UNKNOWN')}")
        lines.append(f"Evidence/source: {a.get('evidence_source', 'UNKNOWN')}")
        lines.append(f"Threat likelihood (self-reported): {a.get('threat_likelihood', 'UNKNOWN')}")
        if r:
            lines.append(f"Calculated risk score: {r.get('risk_score', 'UNKNOWN')}/100")
            lines.append(f"Risk level: {r.get('risk_level', 'UNKNOWN')}")
            lines.append(f"Threat status: {r.get('threat_status', 'UNKNOWN')}")
            lines.append(f"Expected annual loss estimate: {r.get('financial', {}).get('expected_annual_loss', 'UNKNOWN')}")
            lines.append(f"Recommendations: {r.get('recommendations', 'UNKNOWN')}")
    else:
        lines.append("Employees: UNKNOWN")
        lines.append("Sector: UNKNOWN")
        lines.append("Security assessment: NOT COMPLETED — user has not submitted their risk assessment yet")
        lines.append("IMPORTANT: Since no assessment is on file, all infrastructure details are UNKNOWN. Do NOT assume anything.")

    return "\n".join(lines)


def _build_context_prompt(context: str) -> str:
    return f"{SYSTEM_PROMPT}\n\n=== ORGANIZATION ASSESSMENT CONTEXT ===\n{context}\n=== END CONTEXT ==="


def _build_citizen_context_prompt() -> str:
    return CITIZEN_SYSTEM_PROMPT


def _history_messages(conversation: list[dict[str, Any]], message: str) -> list[dict[str, str]]:
    history = []
    for item in conversation[-MAX_HISTORY_MESSAGES:]:
        role = item.get("role")
        text = item.get("content", item.get("text", ""))
        if role in {"user", "assistant"} and isinstance(text, str) and text.strip():
            history.append({"role": role, "content": text.strip()})
    history.append({"role": "user", "content": message.strip()})
    return history


async def _call_provider(context: str, conversation: list[dict[str, str]], system_prompt: str | None = None) -> str:
    provider = _provider()
    if provider not in {"gemini", "openai"}:
        raise RuntimeError(f"Unsupported AI provider: {provider}")
    api_key = _api_key()
    if not api_key:
        raise RuntimeError("AI provider key is not configured")

    instruction_text = system_prompt or _build_context_prompt(context)

    async with httpx.AsyncClient(timeout=35.0) as client:
        if provider == "openai":
            payload = {
                "model": _model(),
                "messages": [{"role": "system", "content": instruction_text}, *conversation],
                "temperature": 0.2,
                "max_tokens": 650,
            }
            response = await client.post(
                _provider_url(), json=payload,
                headers={"Authorization": f"Bearer {api_key}"},
            )
            response.raise_for_status()
            data = response.json()
            reply = data.get("choices", [{}])[0].get("message", {}).get("content", "")
        else:
            contents = [
                {"role": "user" if item["role"] == "user" else "model", "parts": [{"text": item["content"]}]}
                for item in conversation
            ]
            payload = {
                "system_instruction": {"parts": [{"text": instruction_text}]},
                "contents": contents,
                "generationConfig": {
                    "temperature": 0.2,
                    "topP": 0.9,
                    "maxOutputTokens": GEMINI_MAX_OUTPUT_TOKENS,
                },
            }
            response = await client.post(
                _provider_url(), params={"key": api_key}, json=payload,
            )
            response.raise_for_status()
            data = response.json()
            candidates = data.get("candidates", [])
            candidate = candidates[0] if candidates else {}
            usage = data.get("usageMetadata", {})
            print(
                "[INFO] Gemini response "
                f"finish_reason={candidate.get('finishReason', 'UNKNOWN')} "
                f"prompt_tokens={usage.get('promptTokenCount', 'UNKNOWN')} "
                f"candidate_tokens={usage.get('candidatesTokenCount', 'UNKNOWN')} "
                f"thoughts_tokens={usage.get('thoughtsTokenCount', 'UNKNOWN')}"
            )
            if candidate.get("finishReason") == "MAX_TOKENS":
                raise RuntimeError("Gemini response reached the configured output limit")
            reply = "".join(
                part.get("text", "")
                for part in candidate.get("content", {}).get("parts", [])
                if isinstance(part.get("text", ""), str)
            )

    if not isinstance(reply, str) or not reply.strip():
        raise ValueError("AI provider returned an empty response")
    return reply.strip()


# ── Rule-based fallback ───────────────────────────────────────────────────────

_FALLBACK_RULES = [
    (
        ["phishing", "suspicious email", "fake email"],
        "Phishing response steps:\n"
        "1. Do NOT click any links or download attachments from the suspicious email.\n"
        "2. Mark the email as phishing/spam and report it to your email provider.\n"
        "3. If you clicked a link: immediately change your passwords and enable MFA.\n"
        "4. Check your recent login activity for unauthorized access.\n"
        "5. Inform your security team or IT contact.\n"
        "To give you more specific advice, tell me: Was this a personal account or a business account? Did you click any links?"
    ),
    (
        ["suspicious login", "unauthorized access", "account breach", "hacked", "compromised"],
        "For a suspected unauthorized login:\n"
        "1. Immediately change the password for the affected account.\n"
        "2. Enable MFA if not already active.\n"
        "3. Review the account's recent login history and active sessions — revoke unknown sessions.\n"
        "4. Check what data was accessible from that account.\n"
        "5. Preserve login logs as evidence before taking further action.\n"
        "6. If this is a business system, isolate the account and notify your security team.\n"
        "To advise further: Which system was affected? Do you have MFA enabled on that account?"
    ),
    (
        ["no employee", "no staff", "just started", "new company", "startup", "no team", "i am alone", "only me"],
        "Understood — you have no employees currently, so I will not assume any unreported infrastructure.\n\n"
        "For a new organization with a suspected cyber threat:\n"
        "1. First: identify WHAT system generated the alert — your website, cloud account, personal device, or domain?\n"
        "2. Do NOT spend your security budget until you know what was affected.\n"
        "3. Immediate free actions: change all passwords for your business accounts, enable MFA everywhere, check active sessions.\n"
        "4. Preserve logs and evidence before making changes.\n\n"
        "What generated the alert? (e.g. website, cloud account, email, device) — I can give specific guidance once I know the affected system."
    ),
    (
        ["ransomware", "files encrypted", "ransom", "locked out"],
        "Ransomware response — act immediately:\n"
        "1. ISOLATE: Disconnect the affected device from the network immediately. Do NOT shut it down.\n"
        "2. PRESERVE: Do not delete or overwrite anything — law enforcement and recovery tools need the encrypted files.\n"
        "3. DO NOT PAY the ransom — payment does not guarantee recovery and funds criminal networks.\n"
        "4. Identify the ransomware variant (nomoreransom.org has free decryption tools for many variants).\n"
        "5. Restore from your most recent clean backup.\n"
        "6. Report to CERT-In (cert-in.org.in) — mandatory in India for critical incidents.\n"
        "Do you have a recent backup? Which systems are affected?"
    ),
    (
        ["budget", "spend", "invest", "how much", "priority", "prioritize", "limited budget"],
        "Budget prioritization for maximum risk reduction:\n"
        "1. MFA — typically Rs.1-2 lakh, highest ROI, blocks most credential attacks.\n"
        "2. Vulnerability patching program — Rs.2-3 lakh, closes known exploits.\n"
        "3. Automated backups — Rs.2-3 lakh, protects against ransomware and data loss.\n"
        "4. Incident Response Plan — Rs.0.5-1 lakh, free to write internally.\n"
        "5. Security awareness training — Rs.1 lakh, reduces human-error incidents.\n\n"
        "Avoid buying expensive tools before fixing these fundamentals.\n"
        "What is your available budget and which of these do you currently have?"
    ),
    (
        ["risk score", "risk is high", "why is my risk", "what does risk", "risk level"],
        "Your risk score is calculated from four factors:\n"
        "1. Threat likelihood — how actively you are being targeted\n"
        "2. Vulnerability severity — unpatched systems, missing MFA, weak controls\n"
        "3. Asset criticality — value and sensitivity of your systems\n"
        "4. Exposure — internet-facing systems, public portals, cloud services\n\n"
        "The most common drivers of a high score are: missing MFA, poor patching, and high external exposure.\n"
        "Check your Risk Assessment page for the specific factors affecting your score.\n"
        "Have you completed your organization's assessment? That gives me the exact drivers."
    ),
    (
        ["mfa", "multi-factor", "two factor", "2fa"],
        "MFA (Multi-Factor Authentication) guidance:\n"
        "1. Enable MFA on all accounts — email, cloud consoles, admin panels first.\n"
        "2. Use authenticator apps (Google Authenticator, Microsoft Authenticator) over SMS where possible.\n"
        "3. For a small organization, Google Workspace or Microsoft 365 include MFA at no extra cost.\n"
        "4. MFA alone blocks over 99% of automated credential attacks.\n"
        "Is MFA currently enabled on your critical systems? I can advise on specific platforms if you tell me what you use."
    ),
    (
        ["patch", "update", "vulnerability", "cve", "exploit", "unpatched"],
        "Vulnerability patching guidance:\n"
        "1. Run a vulnerability scan (free tools: OpenVAS, Greenbone, Qualys free tier).\n"
        "2. Prioritize CVSS 9.0+ (Critical) CVEs — patch within 24-48 hours.\n"
        "3. CVSS 7.0-8.9 (High) — patch within 1 week.\n"
        "4. Enable automatic OS and software updates where safe to do so.\n"
        "5. Track your patch status in a simple spreadsheet if no tool is available.\n"
        "What systems are you concerned about? I can advise on specific products."
    ),
]


def _fallback_reply(message: str) -> str:
    msg_lower = message.lower()
    for keywords, reply in _FALLBACK_RULES:
        if any(kw in msg_lower for kw in keywords):
            return reply
    return (
        "I'm your cybersecurity assistant. I can help with:\n"
        "- Understanding your risk score\n"
        "- Responding to active incidents (suspicious logins, phishing, ransomware)\n"
        "- Prioritizing your security budget\n"
        "- MFA, patching, backup, and compliance guidance\n\n"
        "Please ask a specific question and I'll provide guidance based on your organization profile and industry best practices.\n"
        "If you haven't completed your Risk Assessment yet, doing so will allow me to give you personalized recommendations."
    )


def _needs_conservative_incident_reply(message: str) -> bool:
    """Keep high-risk unknown-context incident prompts out of free-form generation."""
    msg = message.lower()
    no_people = any(term in msg for term in ("no employees", "no employee", "no staff", "just started", "new company"))
    active_threat = any(term in msg for term in ("cyber threat", "threat alert", "suspicious", "incident", "hacked", "attack"))
    return no_people and active_threat


# ── Main endpoint ─────────────────────────────────────────────────────────────

class ChatRequest(BaseModel):
    message: str
    conversation: list[dict[str, Any]] = Field(default_factory=list)
    conversation_id: str | None = None


class CitizenChatRequest(BaseModel):
    message: str
    conversation: list[dict[str, Any]] = Field(default_factory=list)
    conversation_id: str | None = None


@router.post("/api/chat")
async def chat(req: ChatRequest, current_user: dict = Depends(require_auth)):
    conversation_id = req.conversation_id or str(uuid4())
    message = req.message.strip()
    if not message:
        return {"reply": "Please enter a question so I can help.", "response": "Please enter a question so I can help.", "source": "validation", "conversation_id": conversation_id}

    # Fetch org and assessment for real context
    org = None
    assessment_doc = None
    try:
        db = get_db()
        org = await db.organizations.find_one(
            {"organization_id": current_user["organization_id"]}
        )
        assessment_doc = await db.assessments.find_one(
            {"organization_id": current_user["organization_id"]}
        )
    except RuntimeError:
        pass

    context = _build_context(current_user, org, assessment_doc)

    conversation = _history_messages(req.conversation, message)
    try:
        reply = await _call_provider(context, conversation)
        return {"reply": reply, "response": reply, "source": _provider(), "conversation_id": conversation_id}
    except (httpx.HTTPStatusError, httpx.RequestError, RuntimeError, ValueError, TypeError, KeyError, IndexError, AttributeError) as exc:
        # Never disguise an unavailable provider as a generated answer.
        print(f"[WARN] AI provider {_provider()} unavailable: {exc.__class__.__name__}")
        raise HTTPException(status_code=503, detail="AI provider is temporarily unavailable") from exc


@router.post("/api/citizen/chat")
async def citizen_chat(req: CitizenChatRequest):
    conversation_id = req.conversation_id or str(uuid4())
    message = req.message.strip()
    if not message:
        return {"reply": "Please enter a question so I can help assess the message safely.", "response": "Please enter a question so I can help assess the message safely.", "source": "validation", "conversation_id": conversation_id}

    conversation = _history_messages(req.conversation, message)
    try:
        reply = await _call_provider("", conversation, system_prompt=_build_citizen_context_prompt())
        return {"reply": reply, "response": reply, "source": _provider(), "conversation_id": conversation_id}
    except (httpx.HTTPStatusError, httpx.RequestError, RuntimeError, ValueError, TypeError, KeyError, IndexError, AttributeError) as exc:
        print(f"[WARN] Citizen AI provider {_provider()} unavailable: {exc.__class__.__name__}")
        raise HTTPException(status_code=503, detail="AI provider is temporarily unavailable") from exc
