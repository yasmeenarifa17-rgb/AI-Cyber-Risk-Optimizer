"""
Assessment routes
=================
POST /api/assessment   — submit or update the organization's cyber risk assessment
GET  /api/assessment   — retrieve the saved assessment (and calculated risk) for the
                         authenticated organization
"""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime, timezone

from .database import get_db
from .dependencies import require_auth
from engines.assessment_engine import normalize, generate_context_recommendations
from engines.risk_engine import calculate_risk
from engines.financial_engine import calculate_financial_risk

router = APIRouter()


# ── Pydantic model ────────────────────────────────────────────────────────────

class AssessmentRequest(BaseModel):
    # Section A — Organization
    sector: str = "IT"
    org_size: str = "Medium"
    employee_count: Optional[int] = Field(default=None, ge=0)
    critical_assets: Optional[int] = Field(default=None, ge=0)
    security_budget_lakhs: Optional[float] = Field(default=None, ge=0)

    # Section B — Infrastructure / Exposure
    internet_facing_systems: Optional[int] = Field(default=None, ge=0)
    web_portals: Optional[int] = Field(default=None, ge=0)
    critical_databases: Optional[int] = Field(default=None, ge=0)
    cloud_usage: str = "No"          # No / Partial / Yes
    remote_workers: str = "No"       # No / Partial / Yes
    external_exposure: str = "Medium" # Low / Medium / High

    # Section C — Security Posture
    mfa: str = "None"                # None / Partial / Full
    endpoint_protection: str = "None" # None / Basic / Advanced
    firewall_waf: str = "None"        # None / Basic / Advanced
    backup: str = "None"              # None / Weekly / Daily
    security_awareness: str = "None"  # None / Occasional / Regular
    patching: str = "Poor"            # Poor / Moderate / Good
    incident_response: str = "No"     # No / Partial / Yes

    # Section D — Current Threat
    active_threat: str = "No"       # Yes / No
    threat_type: str = "Other"
    affected_asset: str = "Unknown"
    threat_severity: str = "Medium" # Low / Medium / High / Critical
    evidence_source: str = "Manual Assessment"
    recent_incident: str = "No"      # Yes / No
    threat_likelihood: str = "Medium" # Low / Medium / High
    vulnerability_severity: str = "Medium" # Low / Medium / High
    asset_criticality: str = "Medium"  # Low / Medium / High


# ── Helpers ───────────────────────────────────────────────────────────────────

def _compute_result(assessment_dict: dict) -> dict:
    """Run normalization + risk engine on assessment dict."""
    factors = normalize(assessment_dict)
    risk = calculate_risk(
        factors["threat_likelihood"],
        factors["vulnerability_severity"],
        factors["asset_criticality"],
        factors["exposure"],
    )
    financial = calculate_financial_risk(
        risk["risk_score"],
        factors["financial_asset_value"],
        factors["incident_probability"],
    )
    recommendations = generate_context_recommendations(assessment_dict, risk["risk_score"])

    return {
        "risk_factors": factors,
        "risk_score": risk["risk_score"],
        "risk_level": risk["risk_level"],
        "threat_status": "THREAT SIGNAL DETECTED" if assessment_dict.get("active_threat") == "Yes" else "NO ACTIVE THREAT DETECTED",
        "threat": {
            "active": assessment_dict.get("active_threat", "No"),
            "type": assessment_dict.get("threat_type", "UNKNOWN"),
            "affected_asset": assessment_dict.get("affected_asset", "UNKNOWN"),
            "severity": assessment_dict.get("threat_severity", "UNKNOWN"),
            "evidence_source": assessment_dict.get("evidence_source", "UNKNOWN"),
        },
        "financial": financial,
        "recommendations": recommendations,
    }


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.post("/api/assessment", status_code=200)
async def submit_assessment(
    req: AssessmentRequest,
    current_user: dict = Depends(require_auth),
):
    db = get_db()
    org_id = current_user["organization_id"]
    now = datetime.now(timezone.utc).isoformat()

    assessment_dict = req.model_dump()
    result = _compute_result(assessment_dict)

    doc = {
        "organization_id": org_id,
        "assessment": assessment_dict,
        "result": result,
        "updated_at": now,
    }

    # Upsert — one assessment record per organization
    existing = await db.assessments.find_one({"organization_id": org_id})
    if existing:
        await db.assessments.update_one(
            {"organization_id": org_id},
            {"$set": doc},
        )
    else:
        await db.assessments.insert_one(doc)

    return {
        "message": "Assessment saved.",
        "assessment": assessment_dict,
        "result": result,
    }


@router.get("/api/assessment")
async def get_assessment(current_user: dict = Depends(require_auth)):
    db = get_db()
    org_id = current_user["organization_id"]

    doc = await db.assessments.find_one({"organization_id": org_id})
    if not doc:
        return {"assessment": None, "result": None}

    return {
        "assessment": doc["assessment"],
        "result": doc["result"],
        "updated_at": doc.get("updated_at"),
    }
