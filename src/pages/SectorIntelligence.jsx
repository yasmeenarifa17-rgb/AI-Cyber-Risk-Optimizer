/**
 * SectorIntelligence.jsx
 *
 * Government / Public-Sector Impact page — MVP / Demonstration
 *
 * Demonstrates the scalable architecture for authorized government agencies
 * to view sector-wide cyber-risk patterns without exposing any private
 * organization identities.
 *
 * All data here is clearly labelled SYNTHETIC / ANONYMIZED SAMPLE.
 * Real aggregation would be powered by a future GET /api/sector/trends endpoint
 * that aggregates anonymized risk metrics across participating organizations.
 */

import { Globe, ShieldAlert, TrendingUp } from 'lucide-react'

// ── Synthetic demonstration data ──────────────────────────────────────────────

const SECTOR_DATA = [
  { sector: 'Finance & Banking',  riskScore: 74, critical: 34, high: 41, medium: 25, trend: '↑' },
  { sector: 'Healthcare',         riskScore: 68, critical: 28, high: 48, medium: 24, trend: '↑' },
  { sector: 'Government / PSU',   riskScore: 61, critical: 19, high: 52, medium: 29, trend: '→' },
  { sector: 'IT / Technology',    riskScore: 58, critical: 22, high: 43, medium: 35, trend: '↓' },
  { sector: 'Education',          riskScore: 52, critical: 12, high: 38, medium: 50, trend: '→' },
  { sector: 'Manufacturing',      riskScore: 47, critical: 10, high: 35, medium: 55, trend: '↓' },
]

const TOP_VULNS = [
  { name: 'Weak Access Controls',        count: 312, pct: 28 },
  { name: 'Unpatched Software (CVE)',     count: 287, pct: 26 },
  { name: 'Phishing / Social Engineering', count: 241, pct: 22 },
  { name: 'Outdated Firmware',            count: 164, pct: 15 },
  { name: 'Insecure APIs',               count: 99,  pct: 9  },
]

const ARCH_STEPS = [
  { label: 'Private Org Workspaces', desc: 'Each registered organization runs isolated risk assessments. Data stays in their own namespace.' },
  { label: 'Anonymized Aggregation', desc: 'Backend aggregates risk metrics across organizations — no names, no assets, no identities exposed.' },
  { label: 'Authorized Gov View',    desc: 'CERT-In / sector regulators access aggregated trends via authenticated government endpoints.' },
  { label: 'Sector-level Intelligence', desc: 'Government analysts see risk distribution, emerging threats, and priority intervention areas.' },
]

// ── Components ────────────────────────────────────────────────────────────────

const toneColor = (score) => score >= 70 ? '#f87978' : score >= 55 ? '#f4b768' : '#52d6cc'

export default function SectorIntelligence() {
  return (
    <div>
      {/* Page header */}
      <div className="page-heading" style={{ marginBottom: '24px' }}>
        <div>
          <p className="eyebrow">Government Impact · Sector View</p>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Globe size={24} style={{ color: '#52d6cc' }} />
            Sector Intelligence
          </h1>
          <p className="subheading">
            How authorized government agencies can monitor sector-wide cyber-risk without exposing private organizational details.
          </p>
        </div>
        <div style={{
          background: 'rgba(244,183,104,.1)', border: '1px solid rgba(244,183,104,.3)',
          borderRadius: '6px', padding: '8px 14px', color: '#f4b768', fontSize: '10px',
          fontWeight: 700, letterSpacing: '.4px', whiteSpace: 'nowrap', alignSelf: 'flex-start',
        }}>
          MVP · SYNTHETIC DATA
        </div>
      </div>

      {/* Architecture flow */}
      <section className="panel" style={{ marginBottom: '13px' }}>
        <div className="panel-header">
          <div>
            <h2>Scalable Government Architecture</h2>
            <p>Private workspace data flows up to authorized government views through anonymization layers.</p>
          </div>
        </div>
        <div style={{ padding: '4px 21px 22px', display: 'flex', gap: '0', overflowX: 'auto' }}>
          {ARCH_STEPS.map((step, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'stretch', flex: '1 1 0', minWidth: '160px' }}>
              <div style={{
                flex: 1, background: '#192431', border: '1px solid #263142', borderRadius: '7px',
                padding: '14px 15px', margin: '0 4px',
              }}>
                <div style={{
                  width: '22px', height: '22px', borderRadius: '50%',
                  background: '#52d6cc', color: '#0c2429',
                  display: 'grid', placeItems: 'center',
                  fontSize: '10px', fontWeight: 700, marginBottom: '10px',
                }}>
                  {i + 1}
                </div>
                <div style={{ color: '#d5e0ec', fontSize: '11px', fontWeight: 700, marginBottom: '5px' }}>{step.label}</div>
                <div style={{ color: '#718096', fontSize: '9px', lineHeight: 1.6 }}>{step.desc}</div>
              </div>
              {i < ARCH_STEPS.length - 1 && (
                <div style={{ display: 'flex', alignItems: 'center', color: '#374a5f', fontSize: '16px', flexShrink: 0 }}>→</div>
              )}
            </div>
          ))}
        </div>
        <div style={{ margin: '0 21px 18px', padding: '10px 14px', background: 'rgba(82,214,204,.05)', border: '1px solid #2a5251', borderRadius: '5px', fontSize: '10px', color: '#8ca4a9' }}>
          <strong style={{ color: '#52d6cc' }}>Privacy guarantee:</strong> Government view never receives organization names, user names, asset names, or individual records. Only anonymized statistical aggregates are exposed.
        </div>
      </section>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.4fr) minmax(0,.6fr)', gap: '13px', marginBottom: '13px' }}>
        {/* Sector risk table */}
        <section className="panel">
          <div className="panel-header">
            <div>
              <h2 style={{ display: 'flex', alignItems: 'center', gap: '7px' }}><ShieldAlert size={14} style={{ color: '#f87978' }} /> Sector Risk Distribution</h2>
              <p>Anonymized aggregate risk scores across industry sectors.</p>
            </div>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Sector</th>
                  <th>Avg risk score</th>
                  <th>Critical %</th>
                  <th>High %</th>
                  <th>Trend</th>
                </tr>
              </thead>
              <tbody>
                {SECTOR_DATA.map((row) => (
                  <tr key={row.sector}>
                    <td><strong>{row.sector}</strong></td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <strong style={{ color: toneColor(row.riskScore), fontFamily: '"Space Grotesk",sans-serif', fontSize: '13px' }}>{row.riskScore}</strong>
                        <div style={{ flex: 1, height: '4px', background: '#2b3949', borderRadius: '3px', maxWidth: '60px' }}>
                          <div style={{ height: '100%', borderRadius: 'inherit', background: toneColor(row.riskScore), width: `${row.riskScore}%` }}></div>
                        </div>
                      </div>
                    </td>
                    <td style={{ color: '#f87978' }}>{row.critical}%</td>
                    <td style={{ color: '#f4b768' }}>{row.high}%</td>
                    <td style={{ color: row.trend === '↑' ? '#f87978' : row.trend === '↓' ? '#52d6cc' : '#f4b768', fontSize: '13px' }}>{row.trend}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Top vulnerabilities */}
        <section className="panel">
          <div className="panel-header">
            <div>
              <h2 style={{ display: 'flex', alignItems: 'center', gap: '7px' }}><TrendingUp size={14} style={{ color: '#f4b768' }} /> Common Vulnerabilities</h2>
              <p>Cross-sector frequency of vulnerability categories.</p>
            </div>
          </div>
          <div className="exposure-bars">
            {TOP_VULNS.map((v) => (
              <div className="exposure-bar" key={v.name}>
                <div><span>{v.name}</span><strong>{v.pct}%</strong></div>
                <div className="chart-track">
                  <i style={{ width: `${v.pct * 3}%`, background: '#f4b768' }}></i>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* Summary metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '13px' }}>
        {[
          { label: 'Organizations monitored', value: '1,240+', detail: 'Across 6 sectors (synthetic)', tone: 'blue' },
          { label: 'Critical risk orgs', value: '23%', detail: 'Require immediate attention', tone: 'red' },
          { label: 'Avg risk reduction (YoY)', value: '−8 pts', detail: 'With active control programs', tone: 'green' },
        ].map((m) => (
          <article className="metric-card" key={m.label}>
            <div className="metric-top">
              <span>{m.label}</span>
            </div>
            <strong className="metric-number" style={{ color: m.tone === 'red' ? '#f87978' : m.tone === 'green' ? '#52d6cc' : '#79aaf6' }}>
              {m.value}
            </strong>
            <div className="metric-bottom">
              <span className="trend positive">{m.detail}</span>
            </div>
          </article>
        ))}
      </div>

      <div style={{ marginTop: '18px', padding: '12px 16px', background: '#131c28', border: '1px solid #263142', borderRadius: '6px', fontSize: '10px', color: '#57687a', lineHeight: 1.7 }}>
        <strong style={{ color: '#52d6cc' }}>Note:</strong> All figures on this page are <strong style={{ color: '#f4b768' }}>synthetic demonstration data</strong> to illustrate the government-impact architecture. Real sector aggregation would be powered by authenticated participation from registered organizations, with full data anonymization enforced at the API layer before exposure to any government endpoint.
      </div>
    </div>
  )
}
