import { useState } from 'react'
import { ShieldCheck } from 'lucide-react'
import { useAuth } from '../state/AuthState'

const inputStyle = {
  width: '100%', background: '#17202d', border: '1px solid #263447', borderRadius: '6px',
  padding: '10px 12px', color: '#f2f5f8', fontSize: '13px', outline: 'none', marginTop: '6px',
  fontFamily: 'inherit',
}
const labelStyle = { display: 'block', color: '#8290a4', fontSize: '11px', marginBottom: '12px' }
const errStyle = {
  background: 'rgba(248,121,120,.1)', border: '1px solid rgba(248,121,120,.3)',
  borderRadius: '5px', color: '#f87978', fontSize: '11px', padding: '10px 13px', marginBottom: '14px',
}

export default function AuthPage() {
  const { login, register } = useAuth()
  const [mode, setMode] = useState('login')   // 'login' | 'register'
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // login fields
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  // register extra fields
  const [name, setName] = useState('')
  const [orgName, setOrgName] = useState('')
  const [orgType, setOrgType] = useState('Enterprise')

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      if (mode === 'login') {
        await login(email, password)
      } else {
        if (!name.trim() || !orgName.trim()) {
          setError('Name and organisation name are required.')
          setLoading(false)
          return
        }
        await register(name, email, password, orgName, orgType)
      }
    } catch (err) {
      setError(err.message.replace(/^API error \d+: /, '').replace(/^{"detail":"/, '').replace(/"}$/, ''))
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
        width: '100%', maxWidth: '400px',
        background: 'rgba(16,23,34,.9)', border: '1px solid #263142',
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
        <div style={{ display: 'flex', gap: '0', marginBottom: '22px', background: '#131c28', border: '1px solid #263142', borderRadius: '6px', padding: '3px' }}>
          {['login', 'register'].map((m) => (
            <button key={m} type="button" onClick={() => { setMode(m); setError('') }}
              style={{
                flex: 1, border: 0, borderRadius: '4px', padding: '7px', fontSize: '11px', fontWeight: 600, cursor: 'pointer',
                background: mode === m ? '#1e2d40' : 'transparent',
                color: mode === m ? '#f2f5f8' : '#8290a4',
                fontFamily: 'inherit',
              }}>
              {m === 'login' ? 'Sign in' : 'Register'}
            </button>
          ))}
        </div>

        {error && <div style={errStyle}>{error}</div>}

        <form onSubmit={handleSubmit}>
          {mode === 'register' && (
            <label style={labelStyle}>
              Full name
              <input style={inputStyle} type="text" value={name} onChange={e => setName(e.target.value)}
                placeholder="Jane Smith" required autoFocus />
            </label>
          )}
          <label style={labelStyle}>
            Email address
            <input style={inputStyle} type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="you@organisation.com" required autoFocus={mode === 'login'} />
          </label>
          <label style={labelStyle}>
            Password
            <input style={inputStyle} type="password" value={password} onChange={e => setPassword(e.target.value)}
              placeholder="••••••••" required />
          </label>
          {mode === 'register' && (
            <>
              <label style={labelStyle}>
                Organisation name
                <input style={inputStyle} type="text" value={orgName} onChange={e => setOrgName(e.target.value)}
                  placeholder="Acme Corp" required />
              </label>
              <label style={labelStyle}>
                Organisation type
                <select value={orgType} onChange={e => setOrgType(e.target.value)}
                  style={{ ...inputStyle, marginTop: '6px' }}>
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
              padding: '11px', background: '#52d6cc', color: '#10262a',
              fontSize: '12px', fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.75 : 1, fontFamily: 'inherit',
            }}>
            {loading ? (mode === 'login' ? 'Signing in…' : 'Creating workspace…') : (mode === 'login' ? 'Sign in' : 'Create workspace')}
          </button>
        </form>

        <p style={{ color: '#57606a', fontSize: '10px', textAlign: 'center', marginTop: '20px' }}>
          SIH26105 · AI Cyber Risk Optimizer
        </p>
      </div>
    </div>
  )
}
