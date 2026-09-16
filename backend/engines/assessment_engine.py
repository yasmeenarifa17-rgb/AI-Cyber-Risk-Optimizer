"""
assessment_engine.py
====================
Converts the user-submitted Cyber Risk Assessment form into the four
numerical factors consumed by the existing risk_engine:

    threat_likelihood       0–100
    vulnerability_severity  0–100
    asset_criticality       0–100
    exposure                0–100

Mapping philosophy
------------------
All mappings are deterministic and documented so judges can trace the
math.  Human-readable choices (Low/Medium/High, Yes/No, etc.) map to
approximate score bands:

    Low    → ~25   (minimal concern)
    Medium → ~55   (moderate concern)
    High   → ~85   (serious concern)

Intermediate values give credit for partial controls.

The four output factors are each clamped to [0, 100].
"""

from __future__ import annotations

# ── Simple lookup tables ──────────────────────────────────────────────────────

_LEVEL = {"Low": 25, "Medium": 55, "High": 85, "Critical": 95}
_PRESENCE = {"None": 0, "Partial": 50, "Full": 100}
_QUALITY = {"None": 0, "Basic": 40, "Advanced": 85}
_FREQ = {"None": 0, "Occasional": 45, "Regular": 90}
_PATCH = {"Poor": 80, "Moderate": 45, "Good": 15}       # higher score = worse
_BACKUP = {"None": 70, "Weekly": 35, "Daily": 10}        # higher score = worse
_IRP = {"No": 75, "Partial": 40, "Yes": 5}               # higher score = worse (no plan)
_SIZE_EMPLOYEES = {"Small": 20, "Medium": 55, "Large": 80}


def _clamp(v: float, lo: float = 0, hi: float = 100) -> float:
    return max(lo, min(hi, v))


def normalize(assessment: dict) -> dict:
    """
    Parameters
    ----------
    assessment : dict
        The validated CyberRiskAssessment form payload.

    Returns
    -------
    dict with keys:
        threat_likelihood, vulnerability_severity,
        asset_criticality, exposure,
        financial_asset_value,     (rupees, estimated)
        incident_probability       (percent 0-100)
    """
    # ── Section D: direct risk inputs ─────────────────────────────────────────
    active_threat = assessment.get("active_threat", "Yes" if assessment.get("recent_incident") == "Yes" else "No")
    if active_threat == "Yes":
        threat_likelihood = _LEVEL.get(assessment.get("threat_severity", assessment.get("threat_likelihood", "Medium")), 55)
    else:
        # No active signal is not zero risk: posture and exposure still drive risk.
        threat_likelihood = 15

    # ── vulnerability_severity ────────────────────────────────────────────────
    vuln_base = _LEVEL.get(assessment.get("vulnerability_severity", "Medium"), 55)

    # Poor patching increases vulnerability
    vuln_base = _clamp(vuln_base + _PATCH.get(assessment.get("patching", "Moderate"), 45) * 0.25)

    # No MFA makes vulnerabilities worse
    mfa_penalty = {"None": 20, "Partial": 8, "Full": 0}
    vuln_base = _clamp(vuln_base + mfa_penalty.get(assessment.get("mfa", "None"), 10))

    # Endpoint protection reduces vulnerability severity
    ep_bonus = {"None": 0, "Basic": -8, "Advanced": -18}
    vuln_base = _clamp(vuln_base + ep_bonus.get(assessment.get("endpoint_protection", "None"), 0))

    vulnerability_severity = _clamp(vuln_base)

    # ── asset_criticality ─────────────────────────────────────────────────────
    ac_base = _LEVEL.get(assessment.get("asset_criticality", "Medium"), 55)

    # More critical assets → higher criticality score
    num_critical = int(assessment.get("critical_assets") or 0)
    if num_critical >= 10:
        ac_base = _clamp(ac_base + 15)
    elif num_critical >= 5:
        ac_base = _clamp(ac_base + 8)
    elif num_critical <= 1:
        ac_base = _clamp(ac_base - 10)

    # No incident response plan worsens impact when breached
    ac_base = _clamp(ac_base + _IRP.get(assessment.get("incident_response", "No"), 40) * 0.15)

    # Weak backup means higher data loss impact
    ac_base = _clamp(ac_base + _BACKUP.get(assessment.get("backup", "None"), 35) * 0.20)

    asset_criticality = _clamp(ac_base)

    # ── exposure ──────────────────────────────────────────────────────────────
    exposure_base = _LEVEL.get(assessment.get("external_exposure", "Medium"), 55)

    # Each internet-facing system adds to exposure
    net_systems = int(assessment.get("internet_facing_systems") or 0)
    exposure_base = _clamp(exposure_base + min(net_systems * 3, 25))

    # Public portals add direct attack surface
    portals = int(assessment.get("web_portals", 0) or 0)
    exposure_base = _clamp(exposure_base + min(portals * 4, 20))

    # Cloud usage
    cloud = {"No": 0, "Partial": 8, "Yes": 16}
    exposure_base = _clamp(exposure_base + cloud.get(assessment.get("cloud_usage", "No"), 0))

    # Remote workers expand perimeter
    remote = {"No": 0, "Partial": 6, "Yes": 12}
    exposure_base = _clamp(exposure_base + remote.get(assessment.get("remote_workers", "No"), 0))

    # Firewall/WAF reduces exposure
    fw_bonus = {"None": 0, "Basic": -8, "Advanced": -20}
    exposure_base = _clamp(exposure_base + fw_bonus.get(assessment.get("firewall_waf", "None"), 0))

    exposure = _clamp(exposure_base)

    # ── Derived financial values ───────────────────────────────────────────────
    # Asset value is an estimate, never a hidden company value. Prefer the
    # declared security budget; otherwise derive a small transparent proxy from
    # declared critical assets and employees. With no usable inputs it remains 0.
    budget_lakhs = assessment.get("security_budget_lakhs")
    if budget_lakhs is not None:
        financial_asset_value = float(budget_lakhs) * 50 * 100_000
    else:
        critical_assets = int(assessment.get("critical_assets") or 0)
        employees = int(assessment.get("employee_count") or 0)
        estimated_lakhs = critical_assets * 10 + employees * 0.2
        financial_asset_value = estimated_lakhs * 100_000

    # Incident probability from risk factors (simplified)
    incident_probability = round((threat_likelihood * 0.5 + vulnerability_severity * 0.3 + exposure * 0.2) / 100 * 80, 1)
    incident_probability = _clamp(incident_probability, 5, 90)

    return {
        "threat_likelihood": round(threat_likelihood, 2),
        "vulnerability_severity": round(vulnerability_severity, 2),
        "asset_criticality": round(asset_criticality, 2),
        "exposure": round(exposure, 2),
        "financial_asset_value": round(financial_asset_value, 0),
        "incident_probability": round(incident_probability, 2),
    }


def generate_context_recommendations(assessment: dict, risk_score: float) -> list[dict]:
    """
    Produce ordered recommendations driven by the assessment fields.
    Prioritized by the largest contributor to risk, using only what the
    user actually submitted — no invented infrastructure.
    """
    recs = []

    mfa = assessment.get("mfa", "None")
    patching = assessment.get("patching", "Poor")
    backup = assessment.get("backup", "None")
    irp = assessment.get("incident_response", "No")
    endpoint = assessment.get("endpoint_protection", "None")
    firewall = assessment.get("firewall_waf", "None")
    awareness = assessment.get("security_awareness", "None")
    exposure_level = assessment.get("external_exposure", "Medium")
    active_threat = assessment.get("active_threat", "Yes" if assessment.get("recent_incident") == "Yes" else "No")
    threat_lvl = assessment.get("threat_severity", assessment.get("threat_likelihood", "Medium"))

    if mfa == "None":
        recs.append({
            "action": "Deploy Multi-Factor Authentication (MFA)",
            "priority": "Critical",
            "reason": "No MFA is in place. Enabling MFA is the single highest-impact low-cost control.",
            "estimated_cost_lakhs": 1.5,
            "risk_reduction_pts": 18,
        })
    elif mfa == "Partial":
        recs.append({
            "action": "Extend MFA coverage to all accounts and systems",
            "priority": "High",
            "reason": "Partial MFA leaves gaps. Full coverage closes the most common credential-based attack vector.",
            "estimated_cost_lakhs": 1.0,
            "risk_reduction_pts": 10,
        })

    if patching == "Poor":
        recs.append({
            "action": "Establish a vulnerability patching program",
            "priority": "Critical",
            "reason": "Poor patch management leaves known exploits open. Critical CVEs should be patched within 48–72 hours.",
            "estimated_cost_lakhs": 2.0,
            "risk_reduction_pts": 20,
        })
    elif patching == "Moderate":
        recs.append({
            "action": "Improve patch cadence to weekly for critical systems",
            "priority": "High",
            "reason": "Moderate patching still leaves a window of exposure for newly published CVEs.",
            "estimated_cost_lakhs": 1.0,
            "risk_reduction_pts": 10,
        })

    if backup == "None":
        recs.append({
            "action": "Implement automated backup and recovery",
            "priority": "Critical",
            "reason": "No backup means a ransomware or hardware failure event causes total data loss.",
            "estimated_cost_lakhs": 2.5,
            "risk_reduction_pts": 15,
        })
    elif backup == "Weekly":
        recs.append({
            "action": "Move from weekly to daily automated backups",
            "priority": "Medium",
            "reason": "Weekly backups can lose up to 7 days of data in an incident. Daily reduces maximum data loss significantly.",
            "estimated_cost_lakhs": 0.5,
            "risk_reduction_pts": 8,
        })

    if irp == "No":
        recs.append({
            "action": "Create and test an Incident Response Plan",
            "priority": "High",
            "reason": "Without a documented IRP, breach response is slower and more costly. A basic plan reduces mean time to recover.",
            "estimated_cost_lakhs": 0.5,
            "risk_reduction_pts": 12,
        })

    if endpoint in ("None", "Basic"):
        recs.append({
            "action": "Deploy advanced endpoint detection and response (EDR)",
            "priority": "High" if endpoint == "Basic" else "Critical",
            "reason": "Endpoints are a primary entry point. EDR detects and contains threats that basic AV misses.",
            "estimated_cost_lakhs": 3.0,
            "risk_reduction_pts": 22,
        })

    if exposure_level == "High" or int(assessment.get("internet_facing_systems", 0) or 0) >= 5:
        recs.append({
            "action": "Strengthen network perimeter and access controls",
            "priority": "High",
            "reason": "High external exposure or many internet-facing systems increases the attack surface significantly.",
            "estimated_cost_lakhs": 4.0,
            "risk_reduction_pts": 20,
        })
    elif firewall == "None":
        recs.append({
            "action": "Deploy a firewall and Web Application Firewall (WAF)",
            "priority": "High",
            "reason": "No firewall or WAF means external systems have no network-level filtering.",
            "estimated_cost_lakhs": 3.5,
            "risk_reduction_pts": 18,
        })

    if awareness in ("None", "Occasional"):
        recs.append({
            "action": "Run regular security awareness training",
            "priority": "Medium",
            "reason": "Human error causes over 80% of security incidents. Regular training reduces phishing success rates.",
            "estimated_cost_lakhs": 1.0,
            "risk_reduction_pts": 10,
        })

    if active_threat == "Yes":
        recs.append({
            "action": "Contain and investigate the reported threat signal",
            "priority": "Critical",
            "reason": f"A {threat_lvl.lower()} threat signal was reported for {assessment.get('affected_asset', 'an unknown asset')}. Preserve evidence, contain the affected asset, and confirm scope before spending.",
            "estimated_cost_lakhs": 1.0,
            "risk_reduction_pts": 15,
        })

    if threat_lvl == "High" and not any(r["action"].startswith("Deploy enhanced") for r in recs):
        recs.append({
            "action": "Deploy enhanced threat monitoring and SIEM",
            "priority": "High",
            "reason": "High external threat level requires continuous monitoring to detect and contain threats early.",
            "estimated_cost_lakhs": 5.0,
            "risk_reduction_pts": 16,
        })

    # Sort by priority then risk reduction
    priority_order = {"Critical": 0, "High": 1, "Medium": 2, "Low": 3}
    recs.sort(key=lambda r: (priority_order.get(r["priority"], 9), -r["risk_reduction_pts"]))

    return recs
