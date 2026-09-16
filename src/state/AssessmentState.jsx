/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { fetchAssessment, submitAssessment } from '../api/client'
import { useAuth } from './AuthState'

const AssessmentContext = createContext(null)

/**
 * Provides assessment state:
 *   assessment  — the saved form data (null if not completed)
 *   result      — calculated risk result (null if not completed)
 *   loading     — true while fetching/submitting
 *   error       — last error message
 *   submit(data) — submit or update the assessment
 *   refresh()   — re-fetch from backend
 */
export function AssessmentProvider({ children }) {
  const { isAuthenticated } = useAuth()
  const [assessment, setAssessment] = useState(null)
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [bootstrapped, setBootstrapped] = useState(false)

  const refresh = useCallback(async () => {
    if (!isAuthenticated) return
    setLoading(true)
    setError(null)
    try {
      const data = await fetchAssessment()
      setAssessment(data.assessment ?? null)
      setResult(data.result ?? null)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
      setBootstrapped(true)
    }
  }, [isAuthenticated])

  // Load on mount / when auth changes
  useEffect(() => {
    if (isAuthenticated) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      refresh()
    } else {
      setAssessment(null)
      setResult(null)
      setBootstrapped(false)
    }
  }, [isAuthenticated, refresh])

  const submit = useCallback(async (data) => {
    setLoading(true)
    setError(null)
    try {
      const resp = await submitAssessment(data)
      setAssessment(resp.assessment)
      setResult(resp.result)
      return resp
    } catch (err) {
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  return (
    <AssessmentContext.Provider value={{
      assessment,
      result,
      loading,
      error,
      bootstrapped,
      submit,
      refresh,
      isComplete: !!assessment,
    }}>
      {children}
    </AssessmentContext.Provider>
  )
}

export function useAssessment() {
  const ctx = useContext(AssessmentContext)
  if (!ctx) throw new Error('useAssessment must be used inside AssessmentProvider')
  return ctx
}
