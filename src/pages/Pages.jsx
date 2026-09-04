import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowRight, Check, CircleHelp, DollarSign, Gauge, Lightbulb,
  MessageSquare, Play, Send, SlidersHorizontal, Sparkles, Target, Wallet,
} from 'lucide-react'
import { organizationSummary } from '../data/mockData'
import { expectedLoss, riskLevel, riskScore, simulateInvestment, totalExposure } from '../utils/riskCalculations'
import { useAppState } from '../state/AppState'
import {
  calculateFinancialRisk, calculateRisk, fetchRecommendations,
  optimizeInvestment, runSimulation, sendChat,
} from '../api/client'

const money = (lakhs) => lakhs >= 100 ? `₹${(lakhs / 100).toFixed(2)} Cr` : `₹${lakhs.toFixed(lakhs % 1 ? 2 : 0)}L`
const Badge = ({ children, tone = '' }) => <span className={`status-tag ${(tone || children).toLowerCase()}`}>{children}</span>
const PageTitle = ({ eyebrow, title, copy, action }) => <div className="page-heading"><div><p className="eyebrow">{eyebrow}</p><h1>{title}</h1><p className="subheading">{copy}</p></div>{action}</div>
const Metric = ({ label, value, detail, tone = '' }) => <article className="metric-card"><div className="metric-top"><span>{label}</span><Gauge size={17} className={`metric-icon ${tone}`} /></div><strong className="metric-number">{value}</strong><div className="metric-bottom"><span className="trend positive">{detail}</span></div></article>

// ── Error / loading helpers ───────────────────────────────────────────────────

const ApiError = ({ msg }) => msg ? (
  <div style={{ margin: '10px 0', padding: '10px 13px', background: 'rgba(248,121,120,.1)', border: '1px solid rgba(248,121,120,.3)', borderRadius: '5px', color: '#f87978', fontSize: '11px' }}>
    <strong>Backend error:</strong> {msg}
  </div>
) : null

// ── Chatbot panel ─────────────────────────────────────────────────────────────

function ChatPanel() {
  const [messages, setMessages] = useState([
    { role: 'assistant', text: 'Hello! I\'m your cybersecurity assistant. Ask me about your risk scores, vulnerabilities, or what to fix first.' }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  async function handleSend(e) {
    e.preventDefault()
    const text = input.trim()
    if (!text || loading) return
    setInput('')
    setError(null)
    setMessages(m => [...m, { role: 'user', text }])
    setLoading(true)
    try {
      const { reply } = await sendChat(text)
      setMessages(m => [...m, { role: 'assistant', text: reply }])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="panel" style={{ marginTop: '13px' }}>
      <div className="panel-header">
        <div>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
            <MessageSquare size={15} style={{ color: '#52d6cc' }} /> AI Cybersecurity Assistant
          </h2>
          <p>Ask anything about your cyber risk, vulnerabilities, or recommendations.</p>
        </div>
      </div>

      <div style={{
        height: '280px', overflowY: 'auto', padding: '0 21px 12px',
        display: 'flex', flexDirection: 'column', gap: '10px',
      }}>
        {messages.map((m, i) => (
          <div key={i} style={{
            alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
            maxWidth: '80%',
            background: m.role === 'user' ? '#1e3a4a' : '#1a2736',
            border: `1px solid ${m.role === 'user' ? '#2a5a6e' : '#263142'}`,
            borderRadius: m.role === 'user' ? '10px 10px 2px 10px' : '10px 10px 10px 2px',
            padding: '9px 12px',
            color: m.role === 'user' ? '#b8d8e8' : '#c8d8e5',
            fontSize: '12px', lineHeight: 1.6,
          }}>
            {m.role === 'assistant' && (
              <span style={{ color: '#52d6cc', fontSize: '9px', fontWeight: 700, display: 'block', marginBottom: '3px', textTransform: 'uppercase', letterSpacing: '.5px' }}>
                Assistant
              </span>
            )}
            {m.text}
          </div>
        ))}
        {loading && (
          <div style={{ alignSelf: 'flex-start', color: '#52d6cc', fontSize: '11px', padding: '8px 0' }}>
            Thinking…
          </div>
        )}
        {error && <ApiError msg={error} />}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSend} style={{ display: 'flex', gap: '8px', padding: '10px 21px 18px', borderTop: '1px solid #263142' }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="e.g. Why is my risk score high?"
          style={{
            flex: 1, background: '#17202d', border: '1px solid #263447', borderRadius: '6px',
            padding: '9px 12px', color: '#f2f5f8', fontSize: '12px', outline: 'none', fontFamily: 'inherit',
          }}
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          style={{
            background: '#52d6cc', border: 0, borderRadius: '6px', padding: '9px 13px',
            color: '#0c2429', cursor: 'pointer', opacity: (loading || !input.trim()) ? 0.6 : 1,
          }}
          aria-label="Send message"
        >
          <Send size={14} />
        </button>
      </form>
    </section>
  )
}

// ── Dashboard ─────────────────────────────────────────────────────────────────

export function Dashboard({ navigate, firstName = 'there', orgName = 'your organisation' }) {
  const { assets, budget, optimizedResult, appliedControls } = useAppState()
  const exposure = totalExposure(assets)
  const simulated = simulateInvestment(appliedControls, organizationSummary.baselineRisk, exposure)
  const now = new Date()
  const dateStr = now.toLocaleDateString('en-IN', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })

  return (
    <>
      <PageTitle
        eyebrow={`${dateStr}  •  Live posture`}
        title={`Good morning, ${firstName}.`}
        copy={`${orgName} — cyber risk and investment overview.`}
        action={<button className="primary-button" type="button" onClick={() => navigate('optimizer')}><Target size={16} /> Optimize budget</button>}
      />
      <section className="metric-grid">
        <article className="metric-card featured">
          <div className="metric-top">
            <span>Overall cyber risk</span>
            <span className="trend positive">{simulated.riskReduction ? `↓ ${simulated.riskReduction} pts` : 'Stable'}</span>
          </div>
          <div className="score-row">
            <strong>{simulated.projectedRisk}</strong><span>/100</span>
            <div className="score-ring"><div></div></div>
          </div>
          <div className="metric-bottom">
            <span><span className="health-dot"></span>{simulated.riskReduction ? 'After investment' : 'High priority'}</span>
            <span>current projection</span>
          </div>
        </article>
        <Metric label="Expected financial loss" value={money(simulated.projectedLoss)} detail={`${money(exposure)} before controls`} tone="red" />
        <Metric label="Critical vulnerabilities" value={String(organizationSummary.criticalVulnerabilities).padStart(2, '0')} detail="3 need action" tone="red" />
        <Metric label="Vulnerable assets" value={organizationSummary.vulnerableAssets} detail="+2 this month" tone="blue" />
        <Metric label="Available budget" value={money(budget)} detail={`${money(optimizedResult.remaining)} unallocated`} tone="green" />
      </section>

      <div className="content-grid">
        <section className="panel">
          <div className="panel-header">
            <div><h2>Risk by asset</h2><p>Exposure weighted by impact and threat probability.</p></div>
            <button className="text-button" type="button" onClick={() => navigate('assessment')}>View assessment <ArrowRight size={14} /></button>
          </div>
          <div className="chart-area">
            {assets.map((asset) => (
              <div className="chart-row" key={asset.id}>
                <span>{asset.name}</span>
                <div className="chart-track">
                  <i className={asset.criticality.toLowerCase()} style={{ width: `${Math.min(riskScore(asset), 100)}%` }}></i>
                </div>
                <Badge tone={riskLevel(riskScore(asset))}>{riskScore(asset)}</Badge>
              </div>
            ))}
          </div>
        </section>

        <section className="panel">
          <div className="panel-header">
            <div><h2>Financial exposure</h2><p>Expected loss by asset, in lakhs.</p></div>
            <DollarSign size={17} className="metric-icon" />
          </div>
          <div className="financial-chart">
            <div className="donut">
              <strong>{money(exposure)}</strong>
              <span>Total exposure</span>
            </div>
            <div className="legend">
              {assets.map((asset) => (
                <div key={asset.id}>
                  <i className={asset.criticality.toLowerCase()}></i>
                  <span>{asset.name}</span>
                  <strong>{money(expectedLoss(asset))}</strong>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>

      <section className="insight-banner">
        <div className="insight-icon"><Sparkles size={19} /></div>
        <div>
          <span className="eyebrow">AI recommendation</span>
          <h2>₹19L can reduce projected exposure by ₹70L</h2>
          <p>Prioritize the top five controls to target the highest-value risk paths first.</p>
        </div>
        <button className="secondary-button" type="button" onClick={() => navigate('recommendations')}>Review actions <ArrowRight size={14} /></button>
      </section>

      <ChatPanel />
    </>
  )
}

// ── Risk Assessment ───────────────────────────────────────────────────────────

const CRITICALITY_MAP = { Critical: 90, High: 70, Medium: 45, Low: 20 }
const EXPOSURE_MAP = { 'Internet-facing': 85, 'Public access': 70, 'Restricted network': 40, 'Internal network': 25 }

function assetToRiskPayload(asset) {
  return {
    threat_likelihood: Math.round(asset.probability * 100),
    vulnerability_severity: Math.round(asset.cvss * 10),
    asset_criticality: CRITICALITY_MAP[asset.criticality] ?? 50,
    exposure: EXPOSURE_MAP[asset.exposure] ?? 50,
  }
}

export function RiskAssessment() {
  const { assets, selectedAsset: selected, setSelectedAssetId } = useAppState()
  const [filter, setFilter] = useState('All')
  const [sortDescending, setSortDescending] = useState(true)
  const [apiResult, setApiResult] = useState(null)
  const [apiLoading, setApiLoading] = useState(false)
  const [apiError, setApiError] = useState(null)

  const visibleAssets = useMemo(
    () =>
      assets
        .filter((asset) => filter === 'All' || asset.criticality === filter)
        .sort((a, b) => sortDescending ? riskScore(b) - riskScore(a) : riskScore(a) - riskScore(b)),
    [assets, filter, sortDescending],
  )

  function handleSelectAsset(id) {
    setSelectedAssetId(id)
    setApiResult(null)
    setApiError(null)
  }

  async function handleCheckLiveRisk() {
    setApiLoading(true)
    setApiError(null)
    setApiResult(null)
    try {
      const result = await calculateRisk(assetToRiskPayload(selected))
      setApiResult(result)
    } catch (err) {
      setApiError(err.message)
    } finally {
      setApiLoading(false)
    }
  }

  const localScore = riskScore(selected)
  const localLevel = riskLevel(localScore)

  return (
    <>
      <PageTitle eyebrow="01 / Understand" title="Risk assessment" copy="Inspect the factors behind each asset's explainable risk score." />

      <div className="panel assessment-panel">
        <div className="table-toolbar">
          <div><h2>Vulnerability register</h2><p>Click an asset to inspect its risk factors.</p></div>
          <div className="toolbar-actions">
            <select value={filter} onChange={(event) => setFilter(event.target.value)} aria-label="Filter by criticality">
              <option>All</option><option>Critical</option><option>High</option><option>Medium</option>
            </select>
            <button className="filter-button" type="button" onClick={() => setSortDescending(!sortDescending)}>
              <SlidersHorizontal size={14} /> Sort {sortDescending ? 'high to low' : 'low to high'}
            </button>
          </div>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Asset / vulnerability</th><th>CVSS</th><th>Probability</th>
                <th>Criticality</th><th>Risk score</th><th>Financial impact</th><th>Level</th>
              </tr>
            </thead>
            <tbody>
              {visibleAssets.map((asset) => (
                <tr className={selected.id === asset.id ? 'row-selected' : ''} key={asset.id} onClick={() => handleSelectAsset(asset.id)}>
                  <td><strong>{asset.name}</strong><span>{asset.vulnerability}</span></td>
                  <td>{asset.cvss}</td>
                  <td>{Math.round(asset.probability * 100)}%</td>
                  <td><Badge>{asset.criticality}</Badge></td>
                  <td><strong>{riskScore(asset)}</strong>/100</td>
                  <td>{money(asset.impact)}</td>
                  <td><Badge tone={riskLevel(riskScore(asset))}>{riskLevel(riskScore(asset))}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="detail-grid">
        <section className="panel detail-card">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Selected asset</p>
              <h2>{selected.name}</h2>
              <p>{selected.exposure} · Owned by {selected.owner}</p>
            </div>
            <Badge tone={localLevel}>{localLevel}</Badge>
          </div>
          <div className="factor-list">
            <div><span>Vulnerability</span><strong>{selected.vulnerability}</strong></div>
            <div><span>CVSS severity</span><strong>{selected.cvss} / 10</strong></div>
            <div><span>Criticality</span><strong>{selected.criticality}</strong></div>
            <div><span>Probability</span><strong>{Math.round(selected.probability * 100)}%</strong></div>
            <div><span>Financial impact</span><strong>{money(selected.impact)}</strong></div>
            <div><span>Owner</span><strong>{selected.owner}</strong></div>
          </div>

          <div style={{ padding: '0 21px 21px' }}>
            <button className="primary-button" type="button" onClick={handleCheckLiveRisk} disabled={apiLoading}
              style={{ marginTop: '14px', opacity: apiLoading ? 0.7 : 1 }}>
              {apiLoading ? 'Calculating…' : 'Check live risk (API)'}
            </button>
            <ApiError msg={apiError} />
            {apiResult && (
              <div style={{ marginTop: '12px', padding: '12px 14px', background: 'rgba(82,214,204,.07)', border: '1px solid #2a5251', borderRadius: '5px' }}>
                <p style={{ color: '#7e8ca1', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '.3px', margin: '0 0 8px', fontWeight: 700 }}>Live result from backend engine</p>
                <div style={{ display: 'flex', gap: '24px', alignItems: 'baseline' }}>
                  <div>
                    <span style={{ color: '#8290a4', fontSize: '10px', display: 'block', marginBottom: '2px' }}>Risk score</span>
                    <strong style={{ color: '#f2f5f8', fontSize: '22px', fontFamily: '"Space Grotesk", sans-serif' }}>{apiResult.risk_score}</strong>
                    <span style={{ color: '#708096', fontSize: '11px' }}> / 100</span>
                  </div>
                  <div>
                    <span style={{ color: '#8290a4', fontSize: '10px', display: 'block', marginBottom: '4px' }}>Risk level</span>
                    <Badge tone={apiResult.risk_level.toLowerCase()}>{apiResult.risk_level}</Badge>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="explanation"><p>{selected.recommendation}</p></div>
          <div className="formula">Risk = 0.30 × Threat + 0.30 × Vulnerability + 0.25 × Criticality + 0.15 × Exposure</div>
        </section>

        <section className="panel">
          <div className="panel-header">
            <div><h2>Exposure breakdown</h2><p>Financial exposure by asset.</p></div>
            <CircleHelp size={16} style={{ color: '#57687a' }} />
          </div>
          <div className="exposure-bars">
            {assets.map((asset) => (
              <div className="exposure-bar" key={asset.id}>
                <div><span>{asset.name}</span><strong>{money(expectedLoss(asset))}</strong></div>
                <div className="chart-track">
                  <i className={asset.criticality.toLowerCase()} style={{ width: `${Math.min(expectedLoss(asset) / 10, 100)}%` }}></i>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </>
  )
}

// ── Financial Risk ────────────────────────────────────────────────────────────

export function FinancialRisk() {
  const { assets, selectedAsset: selected, selectedAssetId, setSelectedAssetId } = useAppState()
  const [apiResult, setApiResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // Auto-calculate when selected asset changes
  const runCalc = useCallback(async (asset) => {
    setLoading(true)
    setError(null)
    setApiResult(null)
    try {
      const localRiskScore = riskScore(asset)
      const result = await calculateFinancialRisk(
        localRiskScore,
        asset.impact * 100000,     // convert lakhs → absolute value for the engine
        Math.round(asset.probability * 100)
      )
      setApiResult(result)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { runCalc(selected) }, [selected, runCalc])

  const displayLoss = apiResult
    ? (apiResult.expected_annual_loss / 100000)   // engine returns absolute → convert to lakhs
    : expectedLoss(selected)

  return (
    <>
      <PageTitle eyebrow="02 / Quantify" title="Financial risk" copy="Translate cyber events into a language the business can act on." />
      <div className="selector-row">
        <label>Analyze asset
          <select value={selectedAssetId} onChange={(event) => setSelectedAssetId(event.target.value)}>
            {assets.map((asset) => <option key={asset.id} value={asset.id}>{asset.name} · {asset.vulnerability}</option>)}
          </select>
        </label>
      </div>
      <div className="financial-detail-grid">
        <section className="panel calculation-card">
          <div className="panel-header">
            <div><h2>{selected.name}</h2><p>{selected.vulnerability} · {selected.criticality} asset</p></div>
            <Badge tone={riskLevel(riskScore(selected))}>{riskLevel(riskScore(selected))}</Badge>
          </div>
          <div className="loss-equation">
            <div><span>Threat probability</span><strong>{Math.round(selected.probability * 100)}%</strong></div>
            <b>×</b>
            <div><span>Potential impact</span><strong>{money(selected.impact)}</strong></div>
            <b>=</b>
            <div className="loss-result">
              <span>Expected loss {apiResult ? <span style={{ color: '#52d6cc', fontSize: '9px' }}>(live)</span> : '(local)'}</span>
              <strong>{loading ? '…' : money(displayLoss)}</strong>
            </div>
          </div>
          <div className="calculation-note">Expected Loss = Probability of Incident × Potential Financial Impact</div>
          <ApiError msg={error} />
        </section>

        <section className="panel">
          <div className="panel-header">
            <div><h2>Exposure across assets</h2><p>Total expected loss: {money(totalExposure(assets))}</p></div>
            <Wallet size={17} className="metric-icon green" />
          </div>
          <div className="exposure-bars">
            {assets.map((asset) => (
              <div className="exposure-bar" key={asset.id}>
                <div><span>{asset.name}</span><strong>{money(expectedLoss(asset))}</strong></div>
                <div className="chart-track">
                  <i className={asset.criticality.toLowerCase()} style={{ width: `${expectedLoss(asset) / 10}%` }}></i>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </>
  )
}

// ── Recommendations ───────────────────────────────────────────────────────────

export function Recommendations({ navigate }) {
  const { recommendations: mockRecs, markedRecommendationIds, toggleRecommendation } = useAppState()
  const [apiRecs, setApiRecs] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  async function loadApiRecs() {
    setLoading(true)
    setError(null)
    try {
      // Use worst-case asset parameters to get the most relevant recommendations
      const data = await fetchRecommendations(80, 95, 90, 85)
      setApiRecs(data.recommendations)
    } catch (err) {
      setError(err.message)
      setApiRecs(null)
    } finally {
      setLoading(false)
    }
  }

  // Display: merge API labels into mock recommendations for UI continuity
  const displayRecs = mockRecs  // keep mock recs for UI (investment/reduction values intact)

  return (
    <>
      <PageTitle eyebrow="03 / Decide" title="AI recommendations" copy="Deterministic recommendations ranked by risk reduction value."
        action={<button className="primary-button" type="button" onClick={() => navigate('optimizer')}><Target size={16} /> Open optimizer</button>}
      />

      <div className="recommendation-toolbar">
        <span>{markedRecommendationIds.length} action{markedRecommendationIds.length === 1 ? '' : 's'} marked for investment</span>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button className="filter-button" type="button" onClick={loadApiRecs} disabled={loading}>
            {loading ? 'Fetching…' : 'Refresh from engine'}
          </button>
          <button className="text-button" type="button" onClick={() => markedRecommendationIds.forEach(toggleRecommendation)}>Clear selection</button>
        </div>
      </div>

      <ApiError msg={error} />

      {/* Show live engine output as an info banner when available */}
      {apiRecs && (
        <div style={{ background: 'rgba(82,214,204,.06)', border: '1px solid #2a5251', borderRadius: '7px', padding: '14px 18px', marginBottom: '13px', fontSize: '11px', color: '#8ca4a9' }}>
          <strong style={{ color: '#52d6cc', display: 'block', marginBottom: '6px' }}>Live engine output ({apiRecs.length} actions)</strong>
          {apiRecs.map((r, i) => <div key={i} style={{ marginBottom: '4px' }}><Badge tone={r.priority.toLowerCase()}>{r.priority}</Badge> <span style={{ marginLeft: '6px' }}>{r.action}</span></div>)}
        </div>
      )}

      <div className="recommendation-grid">
        {displayRecs.map((item, index) => {
          const selected = markedRecommendationIds.includes(item.id)
          return (
            <article className={`panel recommendation-card ${selected ? 'recommendation-selected' : ''}`} key={item.id}>
              <div className="recommendation-top"><span className="rec-index">0{index + 1}</span><Badge tone={item.priority}>{item.priority}</Badge></div>
              <h2>{item.action}</h2>
              <p className="related">Problem · {item.related} · {item.vulnerability}</p>
              <div className="recommendation-stats">
                <div><span>Investment</span><strong>{money(item.cost)}</strong></div>
                <div><span>Risk reduction</span><strong className="positive-text">{money(item.reduction)}</strong></div>
                <div><span>Financial benefit</span><strong className="positive-text">{money(item.reduction)}</strong></div>
              </div>
              <p className="reason"><Lightbulb size={15} />{item.reason}</p>
              <button className={`select-action ${selected ? 'selected' : ''}`} type="button" onClick={() => toggleRecommendation(item.id)}>
                {selected ? <><Check size={14} /> Marked for investment</> : 'Mark for investment'}
              </button>
            </article>
          )
        })}
      </div>
    </>
  )
}

// ── Investment Optimizer ──────────────────────────────────────────────────────

export function InvestmentOptimizer() {
  const { recommendations, budget, setBudget, optimizedResult, applyOptimizedPlan } = useAppState()
  const [apiResult, setApiResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  async function runOptimize() {
    setLoading(true)
    setError(null)
    try {
      const result = await optimizeInvestment(budget * 100000)  // lakhs → absolute
      setApiResult(result)
    } catch (err) {
      setError(err.message)
      setApiResult(null)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <PageTitle eyebrow="04 / Allocate" title="Investment optimizer" copy="Find the highest-impact security allocation within your budget."
        action={
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="secondary-button" type="button" onClick={runOptimize} disabled={loading}>
              {loading ? 'Optimizing…' : 'Run engine'}
            </button>
            <button className="primary-button" type="button" onClick={applyOptimizedPlan}><Play size={15} /> Apply plan</button>
          </div>
        }
      />

      <section className="optimizer-controls panel">
        <label>Available cybersecurity budget
          <input type="number" min="0" value={budget} onChange={(event) => setBudget(event.target.value)} />
          <span>₹ Lakhs</span>
        </label>
        <div className="budget-quick">
          {[5,10,15,20,25,30].map((value) => (
            <button className={budget === value ? 'selected' : ''} type="button" key={value} onClick={() => setBudget(value)}>₹{value}L</button>
          ))}
        </div>
        <p>Controls are ranked by risk reduction per rupee while respecting your budget.</p>
      </section>

      <ApiError msg={error} />

      {/* Live API result banner */}
      {apiResult && (
        <div style={{ background: 'rgba(82,214,204,.06)', border: '1px solid #2a5251', borderRadius: '7px', padding: '14px 18px', marginBottom: '13px' }}>
          <strong style={{ color: '#52d6cc', fontSize: '11px', display: 'block', marginBottom: '8px' }}>Backend engine result</strong>
          <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', fontSize: '11px', color: '#8ca4a9' }}>
            <div><span style={{ display: 'block', fontSize: '9px', textTransform: 'uppercase', color: '#57687a', marginBottom: '2px' }}>Controls selected</span><strong style={{ color: '#f2f5f8' }}>{apiResult.selected_controls?.length ?? 0}</strong></div>
            <div><span style={{ display: 'block', fontSize: '9px', textTransform: 'uppercase', color: '#57687a', marginBottom: '2px' }}>Total investment</span><strong style={{ color: '#f2f5f8' }}>₹{((apiResult.total_investment ?? 0) / 100000).toFixed(1)}L</strong></div>
            <div><span style={{ display: 'block', fontSize: '9px', textTransform: 'uppercase', color: '#57687a', marginBottom: '2px' }}>Risk reduction</span><strong style={{ color: '#52d6cc' }}>{apiResult.estimated_risk_reduction ?? 0} pts</strong></div>
          </div>
        </div>
      )}

      <div className="optimizer-summary">
        <Metric label="Total allocated" value={money(optimizedResult.allocated)} detail={`${optimizedResult.selected.length} controls selected`} tone="green" />
        <Metric label="Remaining budget" value={money(optimizedResult.remaining)} detail="Available to reserve" tone="blue" />
        <Metric label="Expected reduction" value={money(optimizedResult.reduction)} detail="Projected financial benefit" tone="green" />
        <Metric label="Projected risk" value={`${organizationSummary.baselineRisk - Math.min(organizationSummary.baselineRisk - 1, Math.round(optimizedResult.reduction / 2))}/100`} detail="From baseline" tone="red" />
      </div>

      <section className="panel">
        <div className="table-toolbar"><div><h2>Recommended allocation</h2><p>Ranked by risk-reduction-to-cost value.</p></div></div>
        <div className="control-list">
          {recommendations.map((item) => {
            const selected = optimizedResult.selected.some((control) => control.id === item.id)
            return (
              <div className={`control-row ${selected ? 'selected' : ''}`} key={item.id}>
                <div className={`check-box ${selected ? 'checked' : ''}`}>{selected && <Check size={14} />}</div>
                <div><strong>{item.action}</strong><span>{item.priority} priority · {item.related}</span></div>
                <strong>{money(item.cost)}</strong>
                <span className="reduction">-{money(item.reduction)}</span>
                <span className="value-badge">{(item.reduction / item.cost).toFixed(1)}×</span>
              </div>
            )
          })}
        </div>
      </section>
    </>
  )
}

// ── Simulation ────────────────────────────────────────────────────────────────

export function Simulation() {
  const { assets, recommendations, appliedControlIds, applyOptimizedPlan, toggleAppliedControl } = useAppState()
  const selectedControls = recommendations.filter((item) => appliedControlIds.includes(item.id))
  const baselineLoss = totalExposure(assets)
  const localSimulated = simulateInvestment(selectedControls, organizationSummary.baselineRisk, baselineLoss)

  const [apiResult, setApiResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  async function runApiSimulation() {
    setLoading(true)
    setError(null)
    setApiResult(null)
    try {
      const totalInvestment = selectedControls.reduce((s, c) => s + c.cost, 0)
      const result = await runSimulation(
        organizationSummary.baselineRisk,
        totalInvestment,
        0.5   // reduction_factor: each lakh invested reduces risk by 0.5 points
      )
      setApiResult(result)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const displayRisk = apiResult ? apiResult.new_risk : localSimulated.projectedRisk
  const displayReduction = apiResult ? apiResult.risk_reduction : localSimulated.riskReduction

  return (
    <>
      <PageTitle eyebrow="05 / Prove impact" title="Risk reduction simulation" copy="Select controls or apply the latest optimized allocation."
        action={
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="secondary-button" type="button" onClick={applyOptimizedPlan}><Play size={14} /> Use optimized plan</button>
            <button className="secondary-button" type="button" onClick={runApiSimulation} disabled={loading}>
              {loading ? 'Simulating…' : 'Simulate (API)'}
            </button>
          </div>
        }
      />

      <div className="before-after">
        <section className="panel simulation-card before">
          <span className="sim-label">Before investment</span>
          <strong>{organizationSummary.baselineRisk}<span>/100</span></strong>
          <p>Expected loss <b>{money(baselineLoss)}</b></p>
          <div className="sim-meter"><i style={{ width: `${organizationSummary.baselineRisk}%` }}></i></div>
        </section>
        <div className="sim-arrow"><ArrowRight size={24} /></div>
        <section className="panel simulation-card after">
          <span className="sim-label">After selected controls {apiResult ? <span style={{ color: '#52d6cc', fontSize: '9px' }}>(live)</span> : '(local)'}</span>
          <strong>{displayRisk}<span>/100</span></strong>
          <p>Expected loss <b>{money(localSimulated.projectedLoss)}</b></p>
          <div className="sim-meter"><i style={{ width: `${displayRisk}%` }}></i></div>
        </section>
      </div>

      <ApiError msg={error} />

      <div className="simulation-summary">
        <Metric label="Risk reduction" value={`${displayReduction} points`} detail="Lower residual risk" tone="green" />
        <Metric label="Financial reduction" value={money(localSimulated.reduction)} detail="Avoided expected loss" tone="green" />
        <Metric label="Controls applied" value={selectedControls.length} detail="Selected investments" tone="blue" />
      </div>

      <section className="panel">
        <div className="panel-header"><div><h2>Choose investments</h2><p>Toggle controls to see the projected outcome update immediately.</p></div></div>
        <div className="control-list">
          {recommendations.map((item) => (
            <button className={`control-row simulation-control ${appliedControlIds.includes(item.id) ? 'selected' : ''}`}
              type="button" key={item.id} onClick={() => toggleAppliedControl(item.id)}>
              <div className={`check-box ${appliedControlIds.includes(item.id) ? 'checked' : ''}`}>
                {appliedControlIds.includes(item.id) && <Check size={14} />}
              </div>
              <div><strong>{item.action}</strong><span>{item.priority} priority</span></div>
              <strong>{money(item.cost)}</strong>
              <span className="reduction">-{money(item.reduction)}</span>
            </button>
          ))}
        </div>
      </section>
    </>
  )
}
