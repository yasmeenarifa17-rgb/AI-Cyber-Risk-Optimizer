import { useEffect, useRef, useState } from 'react'
import {
  Activity, Bell, CheckCircle2, ChevronDown, LayoutDashboard,
  LogOut, Menu, Radar, Settings, ShieldCheck, SlidersHorizontal, User, X,
} from 'lucide-react'
import { Dashboard, FinancialRisk, InvestmentOptimizer, Recommendations, RiskAssessment, Simulation } from './pages/Pages'
import { AppStateProvider, useAppState } from './state/AppState'
import { AuthProvider, useAuth } from './state/AuthState'
import AuthPage from './pages/AuthPage'
import './App.css'

const navigation = [
  { id: 'dashboard',       label: 'Dashboard',           icon: LayoutDashboard, group: 'Monitor' },
  { id: 'assessment',      label: 'Risk Assessment',      icon: Radar,           group: 'Monitor' },
  { id: 'financial',       label: 'Financial Risk',       icon: Activity,        group: 'Quantify' },
  { id: 'recommendations', label: 'AI Recommendations',   icon: SlidersHorizontal, group: 'Decide' },
  { id: 'optimizer',       label: 'Investment Optimizer', icon: CheckCircle2,    group: 'Decide' },
  { id: 'simulation',      label: 'Risk Simulation',      icon: Settings,        group: 'Prove impact' },
]

// ── Notification helpers ──────────────────────────────────────────────────────

function buildNotifications(assets, appliedControlIds) {
  const notes = []
  assets.forEach((a) => {
    if (a.criticality === 'Critical') {
      notes.push({ id: `crit-${a.id}`, tone: 'red', title: `Critical risk: ${a.name}`, body: `${a.vulnerability} — CVSS ${a.cvss}` })
    } else if (a.criticality === 'High') {
      notes.push({ id: `high-${a.id}`, tone: 'amber', title: `High vulnerability: ${a.name}`, body: a.vulnerability })
    }
  })
  if (appliedControlIds.length > 0) {
    notes.push({ id: 'controls', tone: 'green', title: `${appliedControlIds.length} control${appliedControlIds.length > 1 ? 's' : ''} applied`, body: 'Risk simulation updated with your selections.' })
  }
  notes.push({ id: 'engine', tone: 'green', title: 'Risk engine online', body: 'All backend engines are operational.' })
  return notes
}

// ── Profile dropdown ──────────────────────────────────────────────────────────

function ProfileDropdown({ user, organization, onLogout }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const initials = user?.name ? user.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() : '??'

  useEffect(() => {
    function handler(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        className="user-avatar"
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-label="Open profile menu"
        title={user?.name ?? ''}
        style={{ cursor: 'pointer' }}
      >
        {initials}
      </button>
      {open && (
        <div style={{
          position: 'absolute', top: '36px', right: 0, zIndex: 50,
          background: '#151d29', border: '1px solid #263142', borderRadius: '8px',
          minWidth: '220px', boxShadow: '0 8px 28px rgba(0,0,0,.45)', padding: '8px 0',
        }}>
          <div style={{ padding: '12px 16px 10px', borderBottom: '1px solid #263142' }}>
            <div style={{ color: '#f2f5f8', fontWeight: 600, fontSize: '13px' }}>{user?.name ?? '—'}</div>
            <div style={{ color: '#8290a4', fontSize: '11px', marginTop: '2px' }}>{user?.email ?? ''}</div>
            <div style={{ color: '#52d6cc', fontSize: '10px', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '5px' }}>
              <User size={11} />{organization?.organization_name ?? 'No organisation'}
            </div>
          </div>
          <button
            type="button"
            onClick={onLogout}
            style={{
              width: '100%', background: 'none', border: 0, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: '10px',
              padding: '10px 16px', color: '#f87978', fontSize: '12px', fontFamily: 'inherit',
            }}
          >
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
  const ref = useRef(null)
  const unread = notifications.length

  useEffect(() => {
    function handler(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const toneColor = { red: '#f87978', amber: '#f4b768', green: '#52d6cc' }

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        className="icon-button notification"
        type="button"
        aria-label="Notifications"
        onClick={() => setOpen(o => !o)}
      >
        <Bell size={18} />
        {unread > 0 && <i></i>}
      </button>
      {open && (
        <div style={{
          position: 'absolute', top: '36px', right: 0, zIndex: 50,
          background: '#151d29', border: '1px solid #263142', borderRadius: '8px',
          minWidth: '280px', maxHeight: '340px', overflowY: 'auto',
          boxShadow: '0 8px 28px rgba(0,0,0,.45)',
        }}>
          <div style={{ padding: '12px 16px 10px', borderBottom: '1px solid #263142', color: '#f2f5f8', fontWeight: 600, fontSize: '12px' }}>
            Notifications
          </div>
          {notifications.map(n => (
            <div key={n.id} style={{ padding: '11px 16px', borderBottom: '1px solid #1e2a38' }}>
              <div style={{ color: toneColor[n.tone] ?? '#f2f5f8', fontWeight: 600, fontSize: '11px' }}>{n.title}</div>
              <div style={{ color: '#8290a4', fontSize: '10px', marginTop: '2px' }}>{n.body}</div>
            </div>
          ))}
          {notifications.length === 0 && (
            <div style={{ padding: '16px', color: '#57606a', fontSize: '11px', textAlign: 'center' }}>No notifications</div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Main App (authenticated) ─────────────────────────────────────────────────

function App() {
  const [page, setPage] = useState('dashboard')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { resetDemo, assets, appliedControlIds } = useAppState()
  const { user, organization, logout } = useAuth()
  const navigate = (nextPage) => { setPage(nextPage); setSidebarOpen(false) }

  const notifications = buildNotifications(assets, appliedControlIds)
  const orgName = organization?.organization_name ?? 'My Organisation'
  const orgInitials = orgName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
  const firstName = user?.name?.split(' ')[0] ?? 'there'

  const pageContent = {
    dashboard:       <Dashboard navigate={navigate} />,
    assessment:      <RiskAssessment />,
    financial:       <FinancialRisk />,
    recommendations: <Recommendations navigate={navigate} />,
    optimizer:       <InvestmentOptimizer />,
    simulation:      <Simulation />,
  }[page]

  async function handleLogout() {
    await logout()
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
              {navigation.filter((item) => item.group === group).map((item) => {
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
            <strong>{navigation.find((item) => item.id === page)?.label}</strong>
          </div>
          <div className="topbar-actions">
            <div className="header-status"><span className="health-dot"></span> Risk engine online</div>
            <NotificationBell notifications={notifications} />
            <ProfileDropdown user={user} organization={organization} onLogout={handleLogout} />
          </div>
        </header>

        <div className="page-wrap">
          {/* Pass real user name to Dashboard */}
          {page === 'dashboard'
            ? <Dashboard navigate={navigate} firstName={firstName} orgName={orgName} />
            : pageContent
          }
          <footer className="page-footer">
            <span><span className="health-dot"></span>CyberRisk AI · Risk Engine Active</span>
            <button className="refresh-button" type="button" onClick={resetDemo}>Reset demo</button>
          </footer>
        </div>
      </main>
    </div>
  )
}

// ── Auth gate ────────────────────────────────────────────────────────────────

function AuthGate() {
  const { isAuthenticated, bootstrapping } = useAuth()
  if (bootstrapping) {
    return (
      <div style={{
        minHeight: '100vh', background: '#0c1119', display: 'flex',
        alignItems: 'center', justifyContent: 'center',
      }}>
        <div style={{ color: '#52d6cc', fontFamily: '"Space Grotesk",sans-serif', fontSize: '14px' }}>
          Loading…
        </div>
      </div>
    )
  }
  if (!isAuthenticated) return <AuthPage />
  return (
    <AppStateProvider>
      <App />
    </AppStateProvider>
  )
}

function AppWithProviders() {
  return (
    <AuthProvider>
      <AuthGate />
    </AuthProvider>
  )
}

export default AppWithProviders
