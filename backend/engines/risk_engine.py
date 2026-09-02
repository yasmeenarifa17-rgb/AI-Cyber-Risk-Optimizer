def calculate_risk(
    threat_likelihood: float,
    vulnerability_severity: float,
    asset_criticality: float,
    exposure: float
):
    risk_score = (
        0.30 * threat_likelihood
        + 0.30 * vulnerability_severity
        + 0.25 * asset_criticality
        + 0.15 * exposure
    )

    risk_score = round(min(max(risk_score, 0), 100), 2)

    if risk_score >= 80:
        level = "Critical"
    elif risk_score >= 60:
        level = "High"
    elif risk_score >= 30:
        level = "Medium"
    else:
        level = "Low"

    return {
        "risk_score": risk_score,
        "risk_level": level
    }