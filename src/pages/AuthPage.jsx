import { useState } from 'react'
import { ArrowLeft, Building2, CheckCircle2, Lock, ShieldCheck, UserRound } from 'lucide-react'
import { useAuth } from '../state/AuthState'
import CitizenPortal from './CitizenPortal'

const inputStyle = {
  width: '100%', background: '#17202d', border: '1px solid #263447', borderRadius: '6px',
  padding: '10px 12px', color: '#f2f5f8', fontSize: '13px', outline: 'none', marginTop: '6px',
  fontFamily: 'inherit',
}
const labelStyle = { display: 'block', color: '#8290a4', fontSize: '11px', marginBottom: '14px' }
const errStyle = {
  background: 'rgba(248,121,120,.1)', border: '1px solid rgba(248,121,120,.3)',
  borderRadius: '5px', color: '#f87978', fontSize: '11px', padding: '10px 13px', marginBottom: '14px',
  lineHeight: 1.5,
}

function cleanError(raw) {
  try {
    const parsed = JSON.parse(raw.replace(/^API error \d+: /, ''))
    if (parsed?.detail) return parsed.detail
  } catch { /* not JSON */ }
  return raw
    .replace(/^API error \d+: /, '')
    .replace(/^{"detail":/, '')
    .replace(/"}$/, '')
}

function TrustModal({ open, onClose }) {
  if (!open) return null
  const controls = [
    'JWT authentication for protected organization access',
    'Password hashing with bcrypt before storage',
    'Organization-level data isolation by authenticated workspace',
    'Backend-only AI credentials and no frontend API keys',
    'HTTPS-ready architecture and environment-based secret management',
    'Input validation and protected backend routes',
    'Controlled AI context limited to the relevant assessment question',
    'In-memory demo fallback only when MongoDB is unavailable',
  ]

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(8,12,18,.72)', display: 'grid', placeItems: 'center', padding: '18px', zIndex: 100 }}>
      <div style={{ width: '100%', maxWidth: '760px', background: '#141d29', border: '1px solid #2d3d50', borderRadius: '12px', padding: '22px 20px 18px', boxShadow: '0 28px 80px rgba(0,0,0,.48)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
          <div>
            <div style={{ color: '#52d6cc', fontSize: '10px', letterSpacing: '.7px', textTransform: 'uppercase', fontWeight: 700 }}>Privacy & Security</div>
            <h3 style={{ margin: '4px 0 0', color: '#f2f5f8', fontSize: '20px', fontWeight: 700 }}>How We Protect Your Data</h3>
          </div>
          <button type="button" onClick={onClose} style={{ border: '1px solid #33445d', background: '#182330', color: '#ebf1f7', borderRadius: '6px', padding: '6px 10px', cursor: 'pointer' }}>Close</button>
        </div>

        <div style={{ display: 'grid', gap: '18px' }}>
          <div style={{ background: '#0f1724', border: '1px solid #263447', borderRadius: '10px', padding: '16px 14px' }}>
            <div style={{ color: '#dfeaf7', fontSize: '11px', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '.6px' }}>Data flow</div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' }}>
              {['Your Data', 'CyberRisk AI Backend', 'Authenticated Organization Workspace', 'Only Required AI Context', 'AI Provider', 'Response', 'User'].map((label, idx, arr) => (
                <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#dfeaf7', fontSize: '10px' }}>
                  <div style={{ background: '#1a2a39', border: '1px solid #2d4258', borderRadius: '6px', padding: '7px 9px', minWidth: '90px', textAlign: 'center' }}>{label}</div>
                  {idx < arr.length - 1 && <span style={{ color: '#5d738e' }}>↓</span>}
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '12px' }}>
            <div style={{ background: '#151f2d', border: '1px solid #263447', borderRadius: '8px', padding: '14px' }}>
              <div style={{ color: '#f2f5f8', fontWeight: 700, marginBottom: '10px' }}>What stays in CyberRisk AI</div>
              <ul style={{ margin: 0, paddingLeft: '18px', color: '#d0ddeb', fontSize: '12px', lineHeight: 1.8 }}>
                <li>Organization records and authenticated workspace access</li>
                <li>Assessment details needed for the risk workflow</li>
                <li>Only the relevant context for the user’s request</li>
              </ul>
            </div>
            <div style={{ background: '#151f2d', border: '1px solid #263447', borderRadius: '8px', padding: '14px' }}>
              <div style={{ color: '#f2f5f8', fontWeight: 700, marginBottom: '10px' }}>What may be sent to the AI provider</div>
              <ul style={{ margin: 0, paddingLeft: '18px', color: '#d0ddeb', fontSize: '12px', lineHeight: 1.8 }}>
                <li>Only the information required to answer the AI request</li>
                <li>Assessment summary and relevant controls</li>
                <li>Not passwords, JWTs, secrets, or unrelated organization records</li>
              </ul>
            </div>
          </div>

          <div style={{ background: '#0f1724', border: '1px solid #263447', borderRadius: '10px', padding: '14px' }}>
            <div style={{ color: '#f2f5f8', fontWeight: 700, marginBottom: '10px' }}>Security controls actually implemented</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '8px' }}>
              {controls.map(control => (
                <div key={control} style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#dfeaf7', fontSize: '12px' }}>
                  <CheckCircle2 size={14} style={{ color: '#52d6cc' }} />
                  <span>{control}</span>
                </div>
              ))}
            </div>
          </div>

          <div style={{ background: 'rgba(82,214,204,.04)', border: '1px solid rgba(82,214,204,.3)', borderRadius: '8px', padding: '14px' }}>
            <div style={{ color: '#f2f5f8', fontWeight: 700, marginBottom: '8px', fontSize: '15px' }}>AI Provider Disclosure</div>
            <p style={{ margin: 0, color: '#dbe7f3', fontSize: '12px', lineHeight: 1.8 }}>
              CyberRisk AI uses a third-party AI model for conversational assistance. AI requests may contain the relevant assessment context required to answer the user&apos;s question. No frontend API keys are exposed, and requests are minimized to the required scope.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function AuthPage() {
  const { login, register } = useAuth()
  const [experience, setExperience] = useState(null)
  const [showTrust, setShowTrust] = useState(false)
  const [mode, setMode] = useState('login')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [orgName, setOrgName] = useState('')
  const [orgType, setOrgType] = useState('Enterprise')

  function validate() {
    if (!email.trim()) return 'Email address is required.'
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'Please enter a valid email address.'
    if (!password) return 'Password is required.'
    if (mode === 'register') {
      if (password.length < 8) return 'Password must be at least 8 characters.'
      if (!name.trim()) return 'Full name is required.'
      if (!orgName.trim()) return 'Organisation name is required.'
    }
    return null
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    const validationError = validate()
    if (validationError) { setError(validationError); return }
    setLoading(true)
    try {
      if (mode === 'login') {
        await login(email.trim(), password)
      } else {
        await register(name.trim(), email.trim(), password, orgName.trim(), orgType)
      }
    } catch (err) {
      setError(cleanError(err.message))
    } finally {
      setLoading(false)
    }
  }

  if (experience === 'citizen') {
    return <CitizenPortal onBack={() => setExperience(null)} />
  }

  if (experience === 'organization') {
    return (
      <div style={{ minHeight: '100vh', background: 'radial-gradient(circle at 75% 0%, #172438 0, #0c1119 38%)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
        <div style={{ width: '100%', maxWidth: '420px', background: 'rgba(16,23,34,.95)', border: '1px solid #263142', borderRadius: '12px', padding: '28px 24px 22px' }}>
          <button type="button" onClick={() => setExperience(null)} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', marginBottom: '16px', border: '1px solid #394d66', background: '#101b29', color: '#dfeaf7', borderRadius: '6px', padding: '7px 10px', cursor: 'pointer' }}>
            <ArrowLeft size={14} /> Back to selection
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px' }}>
            <div style={{ background: '#52d6cc', color: '#0c2429', borderRadius: '7px', width: '31px', height: '31px', display: 'grid', placeItems: 'center' }}><ShieldCheck size={17} /></div>
            <span style={{ color: '#f2f5f8', fontFamily: '"Space Grotesk",sans-serif', fontWeight: 700, fontSize: '18px', letterSpacing: '-.4px' }}>CyberRisk<span style={{ color: '#52d6cc' }}> AI</span></span>
          </div>

          <h2 style={{ color: '#f2f5f8', fontFamily: '"Space Grotesk",sans-serif', fontWeight: 700, fontSize: '19px', margin: '0 0 4px' }}>
            {mode === 'login' ? 'Sign in to your workspace' : 'Create your workspace'}
          </h2>
          <p style={{ color: '#8290a4', fontSize: '12px', margin: '0 0 24px' }}>
            {mode === 'login' ? 'From cyber threats to business decisions' : "Set up your organisation's security workspace"}
          </p>

          <div style={{ display: 'flex', marginBottom: '22px', background: '#131c28', border: '1px solid #263142', borderRadius: '6px', padding: '3px' }}>
            {['login', 'register'].map((m) => (
              <button key={m} type="button" onClick={() => { setMode(m); setError('') }} style={{ flex: 1, border: 0, borderRadius: '4px', padding: '7px', fontSize: '11px', fontWeight: 600, cursor: 'pointer', background: mode === m ? '#1e2d40' : 'transparent', color: mode === m ? '#f2f5f8' : '#8290a4', fontFamily: 'inherit', transition: 'background .15s' }}>
                {m === 'login' ? 'Sign in' : 'Register'}
              </button>
            ))}
          </div>

          {error && <div style={errStyle}>{error}</div>}

          <form onSubmit={handleSubmit} noValidate>
            {mode === 'register' && (
              <label style={labelStyle}>Full name
                <input style={inputStyle} type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Jane Smith" autoFocus />
              </label>
            )}
            <label style={labelStyle}>Email address
              <input style={inputStyle} type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@organisation.com" autoFocus={mode === 'login'} />
            </label>
            <label style={labelStyle}>Password
              <input style={inputStyle} type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder={mode === 'register' ? 'At least 8 characters' : '••••••••'} />
            </label>
            {mode === 'register' && (
              <>
                <label style={labelStyle}>Organisation name
                  <input style={inputStyle} type="text" value={orgName} onChange={e => setOrgName(e.target.value)} placeholder="e.g. Tech Titans Cyber Labs" />
                </label>
                <label style={labelStyle}>Organisation type
                  <select value={orgType} onChange={e => setOrgType(e.target.value)} style={{ ...inputStyle, marginTop: '6px', cursor: 'pointer' }}>
                    <option>Enterprise</option>
                    <option>Government</option>
                    <option>SME</option>
                    <option>Startup</option>
                    <option>Healthcare</option>
                    <option>Banking & Finance</option>
                    <option>IT & Software</option>
                    <option>Retail</option>
                    <option>Telecommunications</option>
                    <option>Energy & Utilities</option>
                  </select>
                </label>
              </>
            )}
            <button type="submit" disabled={loading} style={{ width: '100%', marginTop: '8px', border: 0, borderRadius: '6px', padding: '11px', background: loading ? '#3a9e98' : '#52d6cc', color: '#10262a', fontSize: '12px', fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'inherit', transition: 'background .15s' }}>
              {loading ? (mode === 'login' ? 'Signing in…' : 'Creating workspace…') : (mode === 'login' ? 'Sign in' : 'Create workspace')}
            </button>
          </form>

          <button type="button" onClick={() => setShowTrust(true)} style={{ width: '100%', border: 0, background: 'transparent', color: '#7f90a6', fontSize: '11px', marginTop: '18px', cursor: 'pointer' }}>How we protect your data</button>
        </div>
        <TrustModal open={showTrust} onClose={() => setShowTrust(false)} />
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: 'radial-gradient(circle at 75% 0%, #16273a 0, #0d1219 38%)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '26px 20px' }}>
      <div style={{ width: '100%', maxWidth: '980px', background: 'rgba(15,22,32,.82)', border: '1px solid #263142', borderRadius: '18px', padding: '30px 28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '22px' }}>
          <div style={{ background: '#52d6cc', color: '#0c2429', borderRadius: '8px', width: '34px', height: '34px', display: 'grid', placeItems: 'center' }}><ShieldCheck size={18} /></div>
          <div>
            <div style={{ color: '#f2f5f8', fontSize: '19px', fontWeight: 700, letterSpacing: '-.4px' }}>CyberRisk<span style={{ color: '#52d6cc' }}> AI</span></div>
            <div style={{ color: '#8aa2b7', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '.8px' }}>Trusted Security Decision Support</div>
          </div>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <div style={{ color: '#52d6cc', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '.9px', fontWeight: 700, marginBottom: '6px' }}>Welcome</div>
          <h1 style={{ margin: 0, color: '#f2f5f8', fontSize: '34px', letterSpacing: '-.8px', fontFamily: '"Space Grotesk",sans-serif' }}>How will you use CyberRisk AI?</h1>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '18px', marginBottom: '20px' }}>
          <button type="button" onClick={() => setExperience('organization')} style={{ background: 'linear-gradient(180deg, rgba(26,38,53,1), rgba(18,26,36,1))', border: '1px solid #2a3d50', borderRadius: '14px', padding: '22px 18px', textAlign: 'left', color: '#eff6ff', cursor: 'pointer', boxShadow: '0 18px 40px rgba(0,0,0,.18)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '22px' }}>
              <div style={{ background: '#52d6cc', color: '#0c2429', borderRadius: '10px', width: '42px', height: '42px', display: 'grid', placeItems: 'center' }}><Building2 size={20} /></div>
              <div style={{ fontSize: '11px', color: '#7fc7bb', fontWeight: 700, letterSpacing: '.7px', textTransform: 'uppercase' }}>Organizations</div>
            </div>
            <div style={{ fontSize: '20px', fontWeight: 700, marginBottom: '10px' }}>🏢 ORGANIZATIONS</div>
            <div style={{ color: '#bad0e5', fontSize: '13px', lineHeight: 1.7 }}>Assess organizational cyber risk, financial impact and security investment.</div>
          </button>

          <button type="button" onClick={() => setExperience('citizen')} style={{ background: 'linear-gradient(180deg, rgba(19,34,46,1), rgba(16,24,35,1))', border: '1px solid #2a3d50', borderRadius: '14px', padding: '22px 18px', textAlign: 'left', color: '#eff6ff', cursor: 'pointer', boxShadow: '0 18px 40px rgba(0,0,0,.18)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '22px' }}>
              <div style={{ background: '#79aaf6', color: '#0d1d2b', borderRadius: '10px', width: '42px', height: '42px', display: 'grid', placeItems: 'center' }}><UserRound size={20} /></div>
              <div style={{ fontSize: '11px', color: '#9dc1f8', fontWeight: 700, letterSpacing: '.7px', textTransform: 'uppercase' }}>Citizens</div>
            </div>
            <div style={{ fontSize: '20px', fontWeight: 700, marginBottom: '10px' }}>👤 CITIZENS</div>
            <div style={{ color: '#bad0e5', fontSize: '13px', lineHeight: 1.7 }}>Check suspicious messages, links and cyber scams and learn how to protect your personal data.</div>
          </button>
        </div>

        <div style={{ background: '#152232', border: '1px solid #2b3d50', borderRadius: '12px', padding: '16px 18px', display: 'grid', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#dfeaf7', fontWeight: 700 }}><Lock size={16} style={{ color: '#52d6cc' }} /> How CyberRisk AI Protects Your Information</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '12px' }}>
            {[
              ['Authentication', 'Only authenticated users can access protected organization data.'],
              ['Organization Isolation', 'Organization data is scoped to the authenticated organization.'],
              ['Secret Protection', 'AI credentials remain on the backend and are never exposed to the browser.'],
              ['Controlled AI Context', 'Only relevant information is provided to the AI assistant.'],
              ['Input Validation', 'User inputs are validated before backend processing.'],
              ['Transparent Calculations', 'Risk and financial calculations are deterministic and backend-driven.'],
            ].map(([title, desc]) => (
              <div key={title} style={{ border: '1px solid #263447', borderRadius: '10px', background: '#0f1724', padding: '12px 11px' }}>
                <div style={{ color: '#52d6cc', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '.6px', marginBottom: '6px' }}>{title}</div>
                <div style={{ color: '#dfeaf7', fontSize: '12px', lineHeight: 1.6 }}>{desc}</div>
              </div>
            ))}
          </div>
          <button type="button" onClick={() => setShowTrust(true)} style={{ justifySelf: 'flex-start', background: 'transparent', border: '1px solid #2d4258', color: '#dfeaf7', borderRadius: '6px', padding: '8px 12px', cursor: 'pointer' }}>How we protect your data</button>
        </div>
      </div>
      <TrustModal open={showTrust} onClose={() => setShowTrust(false)} />
    </div>
  )
}
