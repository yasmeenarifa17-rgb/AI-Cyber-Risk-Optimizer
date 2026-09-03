import { useState } from 'react'
import { Activity, Bell, CheckCircle2, ChevronDown, LayoutDashboard, Menu, Radar, Settings, ShieldCheck, SlidersHorizontal, X } from 'lucide-react'
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

function App() {
  const [page, setPage] = useState('dashboard')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { resetDemo } = useAppState()
  const navigate = (nextPage) => { setPage(nextPage); setSidebarOpen(false) }
  const pageContent = { dashboard: <Dashboard navigate={navigate} />, assessment: <RiskAssessment />, financial: <FinancialRisk />, recommendations: <Recommendations navigate={navigate} />, optimizer: <InvestmentOptimizer />, simulation: <Simulation /> }[page]
  return <div className="app-shell">
    <aside className={`sidebar ${sidebarOpen ? 'is-open' : ''}`}>
      <div className="brand"><div className="brand-mark"><ShieldCheck size={19} /></div><span>sentinel<span className="brand-dot">.</span></span></div>
      <div className="workspace-switcher"><div className="workspace-avatar">AC</div><div><strong>Acme Corporation</strong><small>Enterprise workspace</small></div><ChevronDown size={15} /></div>
      <nav className="nav-list" aria-label="Main navigation">{['Monitor', 'Quantify', 'Decide', 'Prove impact'].map((group) => <div key={group}><p className="nav-label">{group}</p>{navigation.filter((item) => item.group === group).map((item) => { const Icon = item.icon; return <button className={`nav-item ${page === item.id ? 'active' : ''}`} type="button" key={item.id} onClick={() => navigate(item.id)}><Icon size={17} />{item.label}{item.id === 'assessment' && <span className="nav-count">12</span>}{item.id === 'recommendations' && <span className="nav-count warning">4</span>}</button> })}</div>)}</nav>
      <div className="sidebar-footer"><div className="status-dot"></div><span>All systems operational</span><button className="icon-button" type="button" aria-label="Open notifications"><Bell size={16} /></button></div>
    </aside>
    <main className="main-content"><header className="topbar"><button className="mobile-menu icon-button" type="button" aria-label="Open menu" onClick={() => setSidebarOpen(!sidebarOpen)}>{sidebarOpen ? <X size={20} /> : <Menu size={20} />}</button><div className="breadcrumbs"><span>SIH26105</span><span>/</span><strong>{navigation.find((item) => item.id === page)?.label}</strong></div><div className="topbar-actions"><div className="header-status"><span className="health-dot"></span> Risk engine online</div><button className="icon-button notification" type="button" aria-label="Notifications"><Bell size={18} /><i></i></button><div className="user-avatar">JD</div></div></header><div className="page-wrap">{pageContent}<footer className="page-footer"><span><span className="health-dot"></span>Mock data · Ready for API integration</span><button className="refresh-button" type="button" onClick={resetDemo}>Reset demo</button></footer></div></main>
  </div>
}
function AppWithState() { return <AppStateProvider><App /></AppStateProvider> }
export default AppWithState
