const BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000').replace(/\/+$/, '')

/** Low-level fetch helper — attaches Bearer token if present */
async function apiFetch(path, options = {}) {
  const token = sessionStorage.getItem('auth_token')
  const headers = { 'Content-Type': 'application/json', ...(options.headers ?? {}) }
  if (token && !headers.Authorization) headers.Authorization = `Bearer ${token}`
  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers })
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText)
    throw new Error(`API error ${res.status}: ${text}`)
  }
  return res.json()
}

// ── Auth ─────────────────────────────────────────────────────────────────────

export async function createFirebaseSession(idToken, profile = {}) {
  return apiFetch('/api/auth/firebase-session', {
    method: 'POST',
    headers: { Authorization: `Bearer ${idToken}` },
    body: JSON.stringify(profile),
  })
}

export async function fetchMe() {
  return apiFetch('/api/auth/me')
}

export async function logout() {
  return apiFetch('/api/auth/logout', { method: 'POST' })
}

// ── Organization ─────────────────────────────────────────────────────────────

export async function fetchOrganization() {
  return apiFetch('/api/organization')
}

export async function updateOrganization(updates) {
  return apiFetch('/api/organization', { method: 'PUT', body: JSON.stringify(updates) })
}

// ── Assessment ───────────────────────────────────────────────────────────────

export async function submitAssessment(data) {
  return apiFetch('/api/assessment', { method: 'POST', body: JSON.stringify(data) })
}

export async function fetchAssessment() {
  return apiFetch('/api/assessment')
}

// ── Chat ─────────────────────────────────────────────────────────────────────

export async function sendChat(message, conversation = [], conversation_id = null) {
  return apiFetch('/api/chat', {
    method: 'POST',
    body: JSON.stringify({ message, conversation, conversation_id }),
  })
}

export async function sendCitizenChat(message, conversation = [], conversation_id = null) {
  return apiFetch('/api/citizen/chat', {
    method: 'POST',
    body: JSON.stringify({ message, conversation, conversation_id }),
  })
}

// ── Risk engine ───────────────────────────────────────────────────────────────

/**
 * POST /api/risk/calculate
 * @param {{ threat_likelihood: number, vulnerability_severity: number, asset_criticality: number, exposure: number }} payload
 * @returns {Promise<{ risk_score: number, risk_level: string }>}
 */
export async function calculateRisk(payload) {
  return apiFetch('/api/risk/calculate', { method: 'POST', body: JSON.stringify(payload) })
}

// ── Financial risk ────────────────────────────────────────────────────────────

export async function calculateFinancialRisk(risk_score, asset_value, incident_probability) {
  return apiFetch('/api/financial-risk', {
    method: 'POST',
    body: JSON.stringify({ risk_score, asset_value, incident_probability }),
  })
}

// ── Recommendations ───────────────────────────────────────────────────────────

export async function fetchRecommendations(threat_likelihood, vulnerability_severity, asset_criticality, exposure) {
  return apiFetch('/api/recommendations', {
    method: 'POST',
    body: JSON.stringify({ threat_likelihood, vulnerability_severity, asset_criticality, exposure }),
  })
}

// ── Investment optimization ───────────────────────────────────────────────────

export async function optimizeInvestment(budgetOrPayload) {
  const payload = typeof budgetOrPayload === 'object'
    ? budgetOrPayload
    : { budget: budgetOrPayload }
  return apiFetch('/api/optimize-investment', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

// ── Simulation ────────────────────────────────────────────────────────────────

export async function runSimulation(current_risk, investment, reduction_factor) {
  return apiFetch('/api/simulate', {
    method: 'POST',
    body: JSON.stringify({ current_risk, investment, reduction_factor }),
  })
}
