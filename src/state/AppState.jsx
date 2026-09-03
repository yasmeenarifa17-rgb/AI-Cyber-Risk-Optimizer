/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useMemo, useState } from 'react'
import { assets, organizationSummary, recommendations } from '../data/mockData'
import { optimizeBudget } from '../utils/optimizer'

const AppStateContext = createContext(null)

export function AppStateProvider({ children }) {
  const [selectedAssetId, setSelectedAssetId] = useState(assets[0].id)
  const [budget, setBudgetState] = useState(organizationSummary.availableBudget)
  const [markedRecommendationIds, setMarkedRecommendationIds] = useState([])
  const [appliedControlIds, setAppliedControlIds] = useState([])
  const selectedAsset = assets.find((asset) => asset.id === selectedAssetId) || assets[0]
  const optimizedResult = useMemo(() => optimizeBudget(budget, recommendations), [budget])
  const selectedRecommendations = recommendations.filter((item) => markedRecommendationIds.includes(item.id))
  const appliedControls = recommendations.filter((item) => appliedControlIds.includes(item.id))
  const setBudget = (value) => setBudgetState(Math.max(0, Number.isFinite(value) ? value : 0))
  const toggleRecommendation = (id) => {
    setMarkedRecommendationIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id])
    setAppliedControlIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id])
  }
  const applyOptimizedPlan = () => setAppliedControlIds(optimizedResult.selected.map((control) => control.id))
  const toggleAppliedControl = (id) => setAppliedControlIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id])
  const resetDemo = () => {
    setSelectedAssetId(assets[0].id)
    setBudgetState(organizationSummary.availableBudget)
    setMarkedRecommendationIds([])
    setAppliedControlIds([])
  }
  return <AppStateContext.Provider value={{ assets, recommendations, selectedAsset, selectedAssetId, setSelectedAssetId, budget, setBudget, markedRecommendationIds, selectedRecommendations, toggleRecommendation, optimizedResult, appliedControls, appliedControlIds, applyOptimizedPlan, toggleAppliedControl, resetDemo }}>{children}</AppStateContext.Provider>
}

export function useAppState() {
  const state = useContext(AppStateContext)
  if (!state) throw new Error('useAppState must be used inside AppStateProvider')
  return state
}
