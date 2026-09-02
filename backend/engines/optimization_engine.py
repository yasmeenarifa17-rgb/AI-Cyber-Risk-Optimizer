def optimize_investment(budget):
    controls = [
        {
            "name": "Vulnerability Patching",
            "cost": 200000,
            "risk_reduction": 18
        },
        {
            "name": "Endpoint Protection",
            "cost": 300000,
            "risk_reduction": 22
        },
        {
            "name": "Network Security",
            "cost": 400000,
            "risk_reduction": 28
        },
        {
            "name": "Security Awareness Training",
            "cost": 100000,
            "risk_reduction": 8
        },
        {
            "name": "Backup and Recovery",
            "cost": 250000,
            "risk_reduction": 15
        }
    ]

    selected = []
    remaining_budget = budget

    controls = sorted(
        controls,
        key=lambda x: x["risk_reduction"] / x["cost"],
        reverse=True
    )

    total_reduction = 0
    total_cost = 0

    for control in controls:
        if control["cost"] <= remaining_budget:
            selected.append(control)
            remaining_budget -= control["cost"]
            total_cost += control["cost"]
            total_reduction += control["risk_reduction"]

    return {
        "selected_controls": selected,
        "total_investment": total_cost,
        "remaining_budget": remaining_budget,
        "estimated_risk_reduction": total_reduction
    }