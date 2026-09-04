import { useEffect, useRef, useState } from 'react'
import { Activity, CheckCircle2, ChevronDown, LayoutDashboard, LogOut, Menu, Radar, Settings, ShieldCheck, SlidersHorizontal, UserCircle, X } from 'lucide-react'
import { Dashboard, FinancialRisk, InvestmentOptimizer, Recommendations, RiskAssessment, Simulation } from './pages/Pages'
import { AppStateProvider, useAppState } from './state/AppState'
import './App.css'

const navigation = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, group: 'Monitor' },
  { id: 'assessment', label: 'Risk Assessment', icon: Radar, group: 'Monitor' },
  { id: 'financial', label: 'Financial Risk', icon: Activity, group: 'Quantify' },
  { id: 'recommendations', label: 'AI Recommendations', icon: SlidersHorizontal, group: 'Decide' },
  { id: 'optimizer', label: 'Investment Optimizer', icon: CheckCircle2, group: 'Decide' },
  { id: 'simulation', label: 'Risk Simulation', icon: Settings, group: 'Prove impact' },
]

const identityStorageKey = 'cyberRiskAiIdentity'

const readStoredIdentity = () => {
  try {
    const storedIdentity = JSON.parse(localStorage.getItem(identityStorageKey))
    return storedIdentity?.organization && storedIdentity?.name && storedIdentity?.email ? storedIdentity : null
  } catch {
    return null
  }
}

const getInitials = (name) => name.trim().split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0].toUpperCase()).join('')

function LoginScreen({ onLogin }) {
  const [form, setForm] = useState({ organization: '', name: '', email: '', password: '' })
  const [error, setError] = useState('')
  const updateField = (field, value) => setForm((current) => ({ ...current, [field]: value }))
  const submit = (event) => {
    event.preventDefault()
    if (!form.organization.trim() || !form.name.trim() || !form.email.trim() || !form.password) {
      setError('Enter your organization, name, email, and password to continue.')
      return
    }
    onLogin({ organization: form.organization.trim(), name: form.name.trim(), email: form.email.trim() })
  }
  return <main className="auth-shell"><section className="auth-panel"><div className="auth-brand"><div className="brand-mark"><ShieldCheck size={19} /></div><strong>CyberRisk AI</strong></div><div className="auth-copy"><p className="eyebrow">Enterprise security workspace</p><h1>Focus your security decisions.</h1><p>Review risk exposure, prioritize controls, and plan investment from one focused workspace.</p></div><form className="auth-form" onSubmit={submit}><div className="auth-heading"><h2>Set up your workspace</h2><p>Enter your organization and work identity to continue.</p></div><label>Organization Name<input type="text" placeholder="Enter your organization name" value={form.organization} onChange={(event) => updateField('organization', event.target.value)} autoComplete="organization" /></label><label>User Name<input type="text" placeholder="Enter your full name" value={form.name} onChange={(event) => updateField('name', event.target.value)} autoComplete="name" /></label><label>Work Email<input type="email" placeholder="name@company.com" value={form.email} onChange={(event) => updateField('email', event.target.value)} autoComplete="email" /></label><label>Password<input type="password" placeholder="Enter your password" value={form.password} onChange={(event) => updateField('password', event.target.value)} autoComplete="new-password" /></label>{error && <p className="auth-error" role="alert">{error}</p>}<button className="primary-button auth-submit" type="submit">Continue to dashboard</button><p className="auth-note">Prototype access only. No account or password is verified.</p></form></section></main>
}

function App() {
  const [page, setPage] = useState('dashboard')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [identity, setIdentity] = useState(readStoredIdentity)
  const profileRef = useRef(null)
  const { resetDemo } = useAppState()
  const navigate = (nextPage) => { setPage(nextPage); setSidebarOpen(false) }
  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (profileRef.current && !profileRef.current.contains(event.target)) setProfileOpen(false)
    }
    document.addEventListener('mousedown', handleOutsideClick)
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [])
  const handleLogin = (nextIdentity) => {
    localStorage.setItem(identityStorageKey, JSON.stringify(nextIdentity))
    setIdentity(nextIdentity)
  }
  const handleLogout = () => {
    localStorage.removeItem(identityStorageKey)
    setIdentity(null)
    setProfileOpen(false)
    setPage('dashboard')
  }
  if (!identity) return <LoginScreen onLogin={handleLogin} />
  const pageContent = { dashboard: <Dashboard navigate={navigate} />, assessment: <RiskAssessment />, financial: <FinancialRisk />, recommendations: <Recommendations navigate={navigate} />, optimizer: <InvestmentOptimizer />, simulation: <Simulation /> }[page]
  return <div className="app-shell">
    <aside className={`sidebar ${sidebarOpen ? 'is-open' : ''}`}>
      <div className="brand"><div className="brand-mark"><ShieldCheck size={19} /></div><span>CyberRisk AI</span></div>
      <div className="workspace-switcher"><div className="workspace-avatar">{getInitials(identity.organization)}</div><div><strong>{identity.organization}</strong><small>Security workspace</small></div><ChevronDown size={15} /></div>
      <nav className="nav-list" aria-label="Main navigation">{['Monitor', 'Quantify', 'Decide', 'Prove impact'].map((group) => <div key={group}><p className="nav-label">{group}</p>{navigation.filter((item) => item.group === group).map((item) => { const Icon = item.icon; return <button className={`nav-item ${page === item.id ? 'active' : ''}`} type="button" key={item.id} onClick={() => navigate(item.id)}><Icon size={17} />{item.label}{item.id === 'assessment' && <span className="nav-count">12</span>}{item.id === 'recommendations' && <span className="nav-count warning">4</span>}</button> })}</div>)}</nav>
      <div className="sidebar-footer"><span>Security workspace</span></div>
    </aside>
    <main className="main-content"><header className="topbar"><button className="mobile-menu icon-button" type="button" aria-label="Open menu" onClick={() => setSidebarOpen(!sidebarOpen)}>{sidebarOpen ? <X size={20} /> : <Menu size={20} />}</button><div className="breadcrumbs"><strong>{navigation.find((item) => item.id === page)?.label}</strong></div><div className="topbar-actions"><div className="profile-wrap" ref={profileRef}><button className="user-avatar" type="button" aria-label="Open profile menu" aria-expanded={profileOpen} onClick={() => setProfileOpen(!profileOpen)}>{getInitials(identity.name)}</button>{profileOpen && <div className="popover profile-popover"><div className="profile-summary"><div className="profile-avatar">{getInitials(identity.name)}</div><div><strong>{identity.name}</strong><span>{identity.email}</span></div></div><div className="profile-org"><span>Organization</span><strong>{identity.organization}</strong></div><div className="profile-menu"><button type="button"><UserCircle size={15} />View Profile</button><button type="button" onClick={handleLogout}><LogOut size={15} />Logout</button></div></div>}</div></div></header><div className="page-wrap">{pageContent}<footer className="page-footer"><span>Workspace data</span><button className="refresh-button" type="button" onClick={resetDemo}>Reset workspace</button></footer></div></main>
  </div>
}

function AppWithState() { return <AppStateProvider><App /></AppStateProvider> }
export default AppWithState
