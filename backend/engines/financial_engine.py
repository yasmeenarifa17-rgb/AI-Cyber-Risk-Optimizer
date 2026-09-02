def calculate_financial_risk(
    risk_score: float,
    asset_value: float,
    incident_probability: float
):
    probability = min(max(incident_probability / 100, 0), 1)

    expected_loss = asset_value * probability * (risk_score / 100)

    return {
        "asset_value": round(asset_value, 2),
        "incident_probability": round(incident_probability, 2),
        "expected_annual_loss": round(expected_loss, 2)
    }