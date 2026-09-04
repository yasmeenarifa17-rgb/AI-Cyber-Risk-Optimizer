import { useEffect, useRef, useState } from 'react'
import {
  Activity, Bell, CheckCircle2, ChevronDown, Globe, LayoutDashboard,
  LogOut, Menu, Radar, Settings, ShieldCheck, SlidersHorizontal, User, X,
} from 'lucide-react'
import {
  Dashboard, FinancialRisk, InvestmentOptimizer,
  Recommendations, RiskAssessment, Simulation,
} from './pages/Pages'
import SectorIntelligence from './pages/SectorIntelligence'
import { AppStateProvider, useAppState } from './state/AppState'
import { AuthProvider, useAuth } from './state/AuthState'
import AuthPage from './pages/AuthPage'
import './App.css'

const navigation = [
  { id: 'dashboard',       label: 'Dashboard',              icon: LayoutDashboard,  group: 'Monitor' },
  { id: 'assessment',      label: 'Risk Assessment',         icon: Radar,            group: 'Monitor' },
  { id: 'financial',       label: 'Financial Risk',          icon: Activity,         group: 'Quantify' },
  { id: 'recommendations', label: 'AI Recommendations',      icon: SlidersHorizontal,group: 'Decide' },
  { id: 'optimizer',       label: 'Investment Optimizer',    icon: CheckCircle2,     group: 'Decide' },
  { id: 'simulation',      label: 'Risk Simulation',         icon: Settings,         group: 'Prove impact' },
  { id: 'sector',          label: 'Sector Intelligence',     icon: Globe,            group: 'Prove impact' },
]

// ── Time-aware greeting ───────────────────────────────────────────────────────

function greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

// ── Notification system ───────────────────────────────────────────────────────

/**
 * Builds the baseline notification list from app state (asset criticality +
 * applied controls). Returns a stable array; callers may merge in event notes.
 */
function baselineNotifications(assets, appliedControlIds) {
  const notes = []
  assets.forEach((a) => {
    if (a.criticality === 'Critical') {
      notes.push({
        id: `crit-${a.id}`, tone: 'red',
        title: `Critical risk: ${a.name}`,
        body: `${a.vulnerability} — CVSS ${a.cvss}`,
        ts: 'Workspace active',
      })
    } else if (a.criticality === 'High') {
      notes.push({
        id: `high-${a.id}`, tone: 'amber',
        title: `High-risk asset: ${a.name}`,
        body: a.vulnerability,
        ts: 'Workspace active',
      })
    }
  })
  if (appliedControlIds.length > 0) {
    notes.push({
      id: 'controls', tone: 'green',
      title: `${appliedControlIds.length} security control${appliedControlIds.length > 1 ? 's' : ''} applied`,
      body: 'Risk simulation updated with your investment selections.',
      ts: 'Just now',
    })
  }
  notes.push({
    id: 'engine', tone: 'green',
    title: 'Risk engine online',
    body: 'All backend engines are operational.',
    ts: 'System',
  })
  return notes
}

// ── Profile dropdown ──────────────────────────────────────────────────────────

function ProfileDropdown({ user, organization, onLogout }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const initials = user?.name
    ? user.name.split(' ').filter(Boolean).map(w => w[0]).join('').slice(0, 2).toUpperCase()
    : '??'

  useEffect(() => {
    function handler(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        className="user-avatar" type="button"
        onClick={() => setOpen(o => !o)}
        aria-label="Open profile menu"
        title={user?.name ?? 'Profile'}
        style={{ cursor: 'pointer' }}
      >
        {initials}
      </button>
      {open && (
        <div style={{
          position: 'absolute', top: '38px', right: 0, zIndex: 60,
          background: '#151d29', border: '1px solid #263142', borderRadius: '8px',
          minWidth: '230px', boxShadow: '0 8px 32px rgba(0,0,0,.55)', padding: '6px 0',
        }}>
          <div style={{ padding: '13px 16px 11px', borderBottom: '1px solid #263142' }}>
            <div style={{ color: '#f2f5f8', fontWeight: 700, fontSize: '13px' }}>{user?.name ?? '—'}</div>
            <div style={{ color: '#8290a4', fontSize: '11px', marginTop: '3px' }}>{user?.email ?? ''}</div>
            <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '3px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#52d6cc', fontSize: '10px' }}>
                <User size={10} />
                <strong style={{ fontWeight: 600 }}>{organization?.organization_name ?? '—'}</strong>
              </div>
              {organization?.organization_type && (
                <div style={{ color: '#57687a', fontSize: '10px', paddingLeft: '15px' }}>
                  {organization.organization_type}
                </div>
              )}
            </div>
          </div>
          <button type="button" onClick={onLogout}
            style={{
              width: '100%', background: 'none', border: 0, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: '10px',
              padding: '10px 16px', color: '#f87978', fontSize: '12px', fontFamily: 'inherit',
            }}>
            <LogOut size={14} /> Sign out
          </button>
        </div>
      )}
    </div>
  )
}

// ── Notification bell ─────────────────────────────────────────────────────────

function NotificationBell({ notifications }) {
  const [open, setOpen] = useState(false)
  const [readIds, setReadIds] = useState(new Set())
  const ref = useRef(null)
  const unread = notifications.filter(n => !readIds.has(n.id)).length
  const toneColor = { red: '#f87978', amber: '#f4b768', green: '#52d6cc' }

  useEffect(() => {
    function handler(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  function markAllRead() {
    setReadIds(new Set(notifications.map(n => n.id)))
  }

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button className="icon-button notification" type="button"
        aria-label={`Notifications${unread > 0 ? ` (${unread} unread)` : ''}`}
        onClick={() => setOpen(o => !o)}>
        <Bell size={18} />
        {unread > 0 && <i></i>}
      </button>
      {open && (
        <div style={{
          position: 'absolute', top: '38px', right: 0, zIndex: 60,
          background: '#151d29', border: '1px solid #263142', borderRadius: '8px',
          width: '300px', maxHeight: '380px', overflowY: 'auto',
          boxShadow: '0 8px 32px rgba(0,0,0,.55)',
        }}>
          <div style={{
            padding: '11px 16px 9px', borderBottom: '1px solid #263142',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <span style={{ color: '#f2f5f8', fontWeight: 700, fontSize: '12px' }}>
              Notifications {unread > 0 && <span style={{ color: '#52d6cc', fontSize: '10px', marginLeft: '4px' }}>{unread} new</span>}
            </span>
            {unread > 0 && (
              <button type="button" onClick={markAllRead}
                style={{ background: 'none', border: 0, color: '#52d6cc', fontSize: '10px', cursor: 'pointer', padding: 0, fontFamily: 'inherit' }}>
                Mark all read
              </button>
            )}
          </div>
          {notifications.length === 0 && (
            <div style={{ padding: '20px 16px', color: '#57606a', fontSize: '11px', textAlign: 'center' }}>No notifications</div>
          )}
          {notifications.map(n => {
            const isUnread = !readIds.has(n.id)
            return (
              <div key={n.id} style={{
                padding: '11px 16px', borderBottom: '1px solid #1a2434',
                background: isUnread ? 'rgba(82,214,204,.03)' : 'transparent',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                  <div style={{ color: toneColor[n.tone] ?? '#f2f5f8', fontWeight: 600, fontSize: '11px', lineHeight: 1.4 }}>
                    {isUnread && <span style={{ display: 'inline-block', width: '5px', height: '5px', borderRadius: '50%', background: toneColor[n.tone] ?? '#52d6cc', marginRight: '5px', verticalAlign: 'middle' }}></span>}
                    {n.title}
                  </div>
                  <span style={{ color: '#3d5060', fontSize: '9px', whiteSpace: 'nowrap', flexShrink: 0 }}>{n.ts}</span>
                </div>
                <div style={{ color: '#8290a4', fontSize: '10px', marginTop: '3px', lineHeight: 1.5 }}>{n.body}</div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── Main App (authenticated) ──────────────────────────────────────────────────

function App() {
  const [page, setPage] = useState('dashboard')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  // Event-driven notifications: appended by page actions
  const [eventNotes, setEventNotes] = useState([])
  const { resetDemo, assets, appliedControlIds } = useAppState()
  const { user, organization, logout } = useAuth()

  const navigate = (nextPage) => { setPage(nextPage); setSidebarOpen(false) }

  /** Pages call this to push a new notification */
  function pushNotification(note) {
    const id = `evt-${Date.now()}`
    const ts = 'Just now'
    setEventNotes(prev => [{ id, ts, ...note }, ...prev].slice(0, 20))
  }

  const baseNotes = baselineNotifications(assets, appliedControlIds)
  // Event notes appear at the top, baseline notes at the bottom
  const notifications = [
    ...eventNotes.filter(e => !baseNotes.find(b => b.id === e.id)),
    ...baseNotes,
  ]

  const orgName = organization?.organization_name ?? 'My Organisation'
  const orgInitials = orgName.split(' ').filter(Boolean).map(w => w[0]).join('').slice(0, 2).toUpperCase()
  const firstName = user?.name?.split(' ')?.[0] ?? 'there'
  const greet = greeting()

  function renderPage() {
    switch (page) {
      case 'dashboard':
        return <Dashboard navigate={navigate} firstName={firstName} orgName={orgName} greet={greet} pushNotification={pushNotification} />
      case 'assessment':
        return <RiskAssessment pushNotification={pushNotification} />
      case 'financial':
        return <FinancialRisk pushNotification={pushNotification} />
      case 'recommendations':
        return <Recommendations navigate={navigate} pushNotification={pushNotification} />
      case 'optimizer':
        return <InvestmentOptimizer pushNotification={pushNotification} />
      case 'simulation':
        return <Simulation pushNotification={pushNotification} />
      case 'sector':
        return <SectorIntelligence />
      default:
        return <Dashboard navigate={navigate} firstName={firstName} orgName={orgName} greet={greet} pushNotification={pushNotification} />
    }
  }

  return (
    <div className="app-shell">
      <aside className={`sidebar ${sidebarOpen ? 'is-open' : ''}`}>
        <div className="brand">
          <div className="brand-mark"><ShieldCheck size={19} /></div>
          <span>sentinel<span className="brand-dot">.</span></span>
        </div>

        <div className="workspace-switcher">
          <div className="workspace-avatar">{orgInitials}</div>
          <div>
            <strong>{orgName}</strong>
            <small>{organization?.organization_type ?? 'Workspace'}</small>
          </div>
          <ChevronDown size={15} />
        </div>

        <nav className="nav-list" aria-label="Main navigation">
          {['Monitor', 'Quantify', 'Decide', 'Prove impact'].map((group) => (
            <div key={group}>
              <p className="nav-label">{group}</p>
              {navigation.filter(item => item.group === group).map((item) => {
                const Icon = item.icon
                return (
                  <button
                    className={`nav-item ${page === item.id ? 'active' : ''}`}
                    type="button" key={item.id}
                    onClick={() => navigate(item.id)}
                  >
                    <Icon size={17} />
                    {item.label}
                    {item.id === 'assessment' && <span className="nav-count">12</span>}
                    {item.id === 'recommendations' && <span className="nav-count warning">4</span>}
                  </button>
                )
              })}
            </div>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="status-dot"></div>
          <span>All systems operational</span>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <button className="mobile-menu icon-button" type="button" aria-label="Open menu"
            onClick={() => setSidebarOpen(!sidebarOpen)}>
            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          <div className="breadcrumbs">
            <span>SIH26105</span><span>/</span>
            <strong>{navigation.find(item => item.id === page)?.label}</strong>
          </div>
          <div className="topbar-actions">
            <div className="header-status"><span className="health-dot"></span> Risk engine online</div>
            <NotificationBell notifications={notifications} />
            <ProfileDropdown user={user} organization={organization} onLogout={logout} />
          </div>
        </header>

        <div className="page-wrap">
          {renderPage()}
          <footer className="page-footer">
            <span><span className="health-dot"></span>CyberRisk AI · Risk Engine Active</span>
            <button className="refresh-button" type="button" onClick={resetDemo}>Reset workspace</button>
          </footer>
        </div>
      </main>
    </div>
  )
}

// ── Auth gate ─────────────────────────────────────────────────────────────────

function AuthGate() {
  const { isAuthenticated, bootstrapping } = useAuth()
  if (bootstrapping) {
    return (
      <div style={{ minHeight: '100vh', background: '#0c1119', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: '#52d6cc', fontFamily: '"Space Grotesk",sans-serif', fontSize: '14px' }}>Loading…</div>
      </div>
    )
  }
  if (!isAuthenticated) return <AuthPage />
  return <AppStateProvider><App /></AppStateProvider>
}

export default function AppWithProviders() {
  return <AuthProvider><AuthGate /></AuthProvider>
}
