import { useState } from 'react'
import { ShieldCheck } from 'lucide-react'
import { useAuth } from '../state/AuthState'

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

/** Strip raw FastAPI JSON out of error strings before showing to users */
function cleanError(raw) {
  try {
    const parsed = JSON.parse(raw.replace(/^API error \d+: /, ''))
    if (parsed?.detail) return parsed.detail
  } catch (_) { /* not JSON */ }
  return raw
    .replace(/^API error \d+: /, '')
    .replace(/^{"detail":"/, '')
    .replace(/"}$/, '')
}

export default function AuthPage() {
  const { login, register } = useAuth()
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

  return (
    <div style={{
      minHeight: '100vh', background: 'radial-gradient(circle at 75% 0%, #172438 0, #0c1119 38%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px',
    }}>
      <div style={{
        width: '100%', maxWidth: '420px',
        background: 'rgba(16,23,34,.95)', border: '1px solid #263142',
        borderRadius: '12px', padding: '36px 32px',
      }}>
        {/* Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '28px' }}>
          <div style={{ background: '#52d6cc', color: '#0c2429', borderRadius: '7px', width: '31px', height: '31px', display: 'grid', placeItems: 'center' }}>
            <ShieldCheck size={17} />
          </div>
          <span style={{ color: '#f2f5f8', fontFamily: '"Space Grotesk",sans-serif', fontWeight: 700, fontSize: '18px', letterSpacing: '-.4px' }}>
            sentinel<span style={{ color: '#52d6cc' }}>.</span>
          </span>
        </div>

        <h2 style={{ color: '#f2f5f8', fontFamily: '"Space Grotesk",sans-serif', fontWeight: 700, fontSize: '19px', margin: '0 0 4px' }}>
          {mode === 'login' ? 'Sign in to your workspace' : 'Create your workspace'}
        </h2>
        <p style={{ color: '#8290a4', fontSize: '12px', margin: '0 0 24px' }}>
          {mode === 'login' ? 'AI Cyber Risk Optimizer — SIH26105' : "Set up your organisation's security workspace"}
        </p>

        {/* Mode toggle */}
        <div style={{ display: 'flex', marginBottom: '22px', background: '#131c28', border: '1px solid #263142', borderRadius: '6px', padding: '3px' }}>
          {['login', 'register'].map((m) => (
            <button key={m} type="button" onClick={() => { setMode(m); setError('') }}
              style={{
                flex: 1, border: 0, borderRadius: '4px', padding: '7px', fontSize: '11px', fontWeight: 600, cursor: 'pointer',
                background: mode === m ? '#1e2d40' : 'transparent',
                color: mode === m ? '#f2f5f8' : '#8290a4',
                fontFamily: 'inherit', transition: 'background .15s',
              }}>
              {m === 'login' ? 'Sign in' : 'Register'}
            </button>
          ))}
        </div>

        {error && <div style={errStyle}>{error}</div>}

        <form onSubmit={handleSubmit} noValidate>
          {mode === 'register' && (
            <label style={labelStyle}>
              Full name
              <input style={inputStyle} type="text" value={name} onChange={e => setName(e.target.value)}
                placeholder="Jane Smith" autoFocus />
            </label>
          )}
          <label style={labelStyle}>
            Email address
            <input style={inputStyle} type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="you@organisation.com" autoFocus={mode === 'login'} />
          </label>
          <label style={labelStyle}>
            Password
            <input style={inputStyle} type="password" value={password} onChange={e => setPassword(e.target.value)}
              placeholder={mode === 'register' ? 'At least 8 characters' : '••••••••'} />
          </label>
          {mode === 'register' && (
            <>
              <label style={labelStyle}>
                Organisation name
                <input style={inputStyle} type="text" value={orgName} onChange={e => setOrgName(e.target.value)}
                  placeholder="e.g. Tech Titans Cyber Labs" />
              </label>
              <label style={labelStyle}>
                Organisation type
                <select value={orgType} onChange={e => setOrgType(e.target.value)}
                  style={{ ...inputStyle, marginTop: '6px', cursor: 'pointer' }}>
                  <option>Enterprise</option>
                  <option>Government</option>
                  <option>SME</option>
                  <option>Startup</option>
                  <option>Healthcare</option>
                  <option>Finance</option>
                  <option>Education</option>
                </select>
              </label>
            </>
          )}
          <button type="submit" disabled={loading}
            style={{
              width: '100%', marginTop: '8px', border: 0, borderRadius: '6px',
              padding: '11px', background: loading ? '#3a9e98' : '#52d6cc', color: '#10262a',
              fontSize: '12px', fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer',
              fontFamily: 'inherit', transition: 'background .15s',
            }}>
            {loading
              ? (mode === 'login' ? 'Signing in…' : 'Creating workspace…')
              : (mode === 'login' ? 'Sign in' : 'Create workspace')}
          </button>
        </form>

        <p style={{ color: '#3d4f61', fontSize: '10px', textAlign: 'center', marginTop: '20px' }}>
          SIH26105 · AI Cyber Risk Optimizer
        </p>
      </div>
    </div>
  )
}
