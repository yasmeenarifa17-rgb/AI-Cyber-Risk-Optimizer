export const riskScore = (asset) => Math.round(asset.cvss * 7 * asset.probability * (asset.criticality === 'Critical' ? 1.15 : asset.criticality === 'High' ? 1 : 0.85))
export const expectedLoss = (asset) => asset.probability * asset.impact
export const riskLevel = (score) => score >= 70 ? 'Critical' : score >= 50 ? 'High' : score >= 30 ? 'Elevated' : 'Moderate'
export const totalExposure = (assets) => assets.reduce((total, asset) => total + expectedLoss(asset), 0)
export const simulateInvestment = (controls, baselineRisk, baselineLoss) => {
	const reduction = controls.reduce((sum, control) => sum + control.reduction, 0)
	const riskReduction = Math.min(baselineRisk - 1, Math.round(reduction / 2))
	return {
		reduction,
		riskReduction,
		projectedRisk: baselineRisk - riskReduction,
		projectedLoss: Math.max(0, baselineLoss - reduction),
	}
}
