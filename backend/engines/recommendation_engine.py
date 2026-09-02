def generate_recommendations(
    threat_likelihood,
    vulnerability_severity,
    asset_criticality,
    exposure
):
    recommendations = []

    if vulnerability_severity >= 70:
        recommendations.append({
            "action": "Patch critical vulnerabilities",
            "priority": "High",
            "reason": "High vulnerability severity increases exploitation risk."
        })

    if exposure >= 70:
        recommendations.append({
            "action": "Strengthen network security controls",
            "priority": "High",
            "reason": "High external exposure increases attack surface."
        })

    if threat_likelihood >= 70:
        recommendations.append({
            "action": "Deploy enhanced threat monitoring",
            "priority": "High",
            "reason": "High threat likelihood requires continuous monitoring."
        })

    if asset_criticality >= 80:
        recommendations.append({
            "action": "Implement additional protection for critical assets",
            "priority": "Critical",
            "reason": "Critical assets have a high potential business impact."
        })

    if not recommendations:
        recommendations.append({
            "action": "Maintain current security controls",
            "priority": "Low",
            "reason": "Current risk indicators are within acceptable levels."
        })

    return recommendations