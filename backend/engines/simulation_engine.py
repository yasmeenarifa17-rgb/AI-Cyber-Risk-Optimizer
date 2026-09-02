def simulate_risk_reduction(
    current_risk,
    investment,
    reduction_factor
):
    reduction = investment * reduction_factor

    new_risk = max(current_risk - reduction, 0)

    return {
        "current_risk": round(current_risk, 2),
        "investment": round(investment, 2),
        "new_risk": round(new_risk, 2),
        "risk_reduction": round(current_risk - new_risk, 2)
    }