/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import { optimizeBudget } from '../utils/optimizer'
import { useAssessment } from './AssessmentState'

const AppStateContext = createContext(null)

/**
 * AppStateProvider
 * ─────────────────
 * When an assessment result is available:
 *   • baselineRisk    → from backend risk engine (real calculation)
 *   • budget          → from organization's declared security_budget_lakhs
 *   • recommendations → from assessment-aware recommendation engine
 *
 * The dashboard is rendered only after an assessment is loaded. Any asset rows
 * shown here are transparent summaries of declared assessment categories, not
 * invented company infrastructure.
 */

function buildAssessmentAssets(assessment, result) {
  if (!assessment || !result) return []

  const factors = result.risk_factors ?? {}
  const riskScoreValue = Math.round(result.risk_score ?? 0)
  const criticality = assessment.asset_criticality ?? 'Medium'
  const impactLakhs = Math.max(1, Number(result.financial?.asset_value ?? 0) / 100000)
  const rows = []
  const add = (id, label, count, exposure) => {
    if (!count || count <= 0) return
    rows.push({
      id,
      name: `${label} (${count})`,
      type: 'Declared assessment category',
      vulnerability: 'Assessment-derived control exposure',
      cvss: Math.max(1, Math.min(10, Number(factors.vulnerability_severity ?? 0) / 10)),
      probability: Math.max(0, Math.min(1, Number(factors.threat_likelihood ?? 0) / 100)),
      criticality,
      impact: impactLakhs / Math.max(1, rows.length + 1),
      exposure,
      owner: 'Organization profile',
      recommendation: 'Review the assessment drivers and prioritized controls',
      assessmentDerived: true,
      riskScore: riskScoreValue,
    })
  }

  add('internet-facing', 'Internet-facing systems', assessment.internet_facing_systems, assessment.external_exposure)
  add('web-portals', 'Public web portals', assessment.web_portals, 'Public access')
  add('databases', 'Critical databases', assessment.critical_databases, 'Restricted network')
  add('cloud', 'Cloud usage', assessment.cloud_usage === 'Yes' ? 1 : assessment.cloud_usage === 'Partial' ? 1 : 0, 'Cloud exposure')
  add('remote-workers', 'Remote worker access', assessment.remote_workers === 'Yes' ? 1 : assessment.remote_workers === 'Partial' ? 1 : 0, 'Remote access')
  if (rows.length === 0 && assessment.critical_assets > 0) {
    add('critical-assets', 'Declared critical assets', assessment.critical_assets, 'Restricted network')
  }
  return rows
}

export function AppStateProvider({ children }) {
  const { result, assessment } = useAssessment()

  // ── Derived values from assessment (when available) ───────────────────────
  const assessmentBudget = assessment?.security_budget_lakhs ?? null
  const assessmentRisk = result?.risk_score ?? null
  const assessmentRecommendations = result?.recommendations ?? null

  // ── Local UI state ────────────────────────────────────────────────────────
  const assets = useMemo(() => buildAssessmentAssets(assessment, result), [assessment, result])
  const [selectedAssetId, setSelectedAssetId] = useState(null)
  const [budget, setBudgetState] = useState(assessmentBudget ?? 0)
  const [markedRecommendationIds, setMarkedRecommendationIds] = useState([])
  const [appliedControlIds, setAppliedControlIds] = useState([])

  // When assessment budget becomes available, update local budget state
  // (only if user hasn't manually changed it)
  const [budgetOverridden, setBudgetOverridden] = useState(false)

  // Build recommendation list usable by AppState consumers
  const recommendations = useMemo(() => {
    if (assessmentRecommendations && assessmentRecommendations.length > 0) {
      return assessmentRecommendations.map((r, i) => ({
        id: `rec-${i}`,
        action: r.action,
        priority: r.priority,
        reason: r.reason,
        related: 'Your assessment',
        vulnerability: r.reason?.split('.')[0] ?? '',
        cost: r.estimated_cost_lakhs ?? 2,
        reduction: r.risk_reduction_pts ?? 10,
      }))
    }
    return []
  }, [assessmentRecommendations])

  const baselineRisk = assessmentRisk ?? 0

  const effectiveBudget = (!budgetOverridden && assessmentBudget != null)
    ? assessmentBudget
    : budget

  const selectedAsset = assets.find(a => a.id === selectedAssetId) || assets[0] || null
  const optimizedResult = useMemo(() => optimizeBudget(effectiveBudget, recommendations), [effectiveBudget, recommendations])
  const selectedRecommendations = recommendations.filter(item => markedRecommendationIds.includes(item.id))
  const appliedControls = recommendations.filter(item => appliedControlIds.includes(item.id))

  const setBudget = useCallback((value) => {
    setBudgetOverridden(true)
    setBudgetState(Math.max(0, Number.isFinite(Number(value)) ? Number(value) : 0))
  }, [])

  const toggleRecommendation = useCallback((id) => {
    setMarkedRecommendationIds(cur => cur.includes(id) ? cur.filter(i => i !== id) : [...cur, id])
    setAppliedControlIds(cur => cur.includes(id) ? cur.filter(i => i !== id) : [...cur, id])
  }, [])

  const applyOptimizedPlan = useCallback(() =>
    setAppliedControlIds(optimizedResult.selected.map(c => c.id))
  , [optimizedResult])

  const toggleAppliedControl = useCallback((id) =>
    setAppliedControlIds(cur => cur.includes(id) ? cur.filter(i => i !== id) : [...cur, id])
  , [])

  const resetDemo = useCallback(() => {
    setSelectedAssetId(assets[0]?.id ?? null)
    setBudgetOverridden(false)
    setBudgetState(assessmentBudget ?? 0)
    setMarkedRecommendationIds([])
    setAppliedControlIds([])
  }, [assessmentBudget, assets])

  return (
    <AppStateContext.Provider value={{
      assets,
      recommendations,
      baselineRisk,
      selectedAsset,
      selectedAssetId,
      setSelectedAssetId,
      budget: effectiveBudget,
      setBudget,
      markedRecommendationIds,
      selectedRecommendations,
      toggleRecommendation,
      optimizedResult,
      appliedControls,
      appliedControlIds,
      applyOptimizedPlan,
      toggleAppliedControl,
      resetDemo,
    }}>
      {children}
    </AppStateContext.Provider>
  )
}

export function useAppState() {
  const state = useContext(AppStateContext)
  if (!state) throw new Error('useAppState must be used inside AppStateProvider')
  return state
}
