import React, { useEffect, useState } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { authAPI } from '../lib/supabase.js'
import Toaster from './Toaster.jsx'
import CommandPalette from './CommandPalette.jsx'

const I = (d, extra) => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">{extra}{d && <path d={d} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />}</svg>
)

const NAV = [
  { section: 'Principal', items: [
    { to: '/', label: 'Dashboard', exact: true, icon: I(null, <><rect x="1" y="1" width="6" height="6" rx="1.5" fill="currentColor" opacity=".9"/><rect x="9" y="1" width="6" height="6" rx="1.5" fill="currentColor" opacity=".45"/><rect x="1" y="9" width="6" height="6" rx="1.5" fill="currentColor" opacity=".45"/><rect x="9" y="9" width="6" height="6" rx="1.5" fill="currentColor" opacity=".7"/></>) },
    { to: '/pipeline', label: 'Pipeline', icon: I('M1 3h14M1 8h10M1 13h6') },
    { to: '/clientes', label: 'Clientes', icon: I('M1 13c0-2.761 2.239-5 5-5', <><circle cx="6" cy="5" r="3" stroke="currentColor" strokeWidth="1.5"/><circle cx="12" cy="10" r="2.5" stroke="currentColor" strokeWidth="1.3"/></>) },
  ]},
  { section: 'Operação', items: [
    { to: '/projetos', label: 'Projetos', icon: I('M5 6h6M5 9h4', <rect x="1" y="2" width="14" height="12" rx="2" stroke="currentColor" strokeWidth="1.5"/>) },
    { to: '/tarefas', label: 'Tarefas', icon: I('M3 8l2.5 2.5L12 5', <rect x="1" y="1" width="14" height="14" rx="2" stroke="currentColor" strokeWidth="1.3"/>) },
    { to: '/agenda', label: 'Agenda', icon: I('M5 1v3M11 1v3M2 7h12', <rect x="2" y="3" width="12" height="11" rx="2" stroke="currentColor" strokeWidth="1.5"/>) },
    { to: '/financeiro', label: 'Financeiro', icon: I('M8 4v8M5.5 6.5C5.5 5.4 6.6 5 8 5s2.5.4 2.5 1.5S9 8 8 8s-2.5.5-2.5 1.5S6.6 11 8 11s2.5-.4 2.5-1.5', <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.5"/>) },
    { to: '/proposta', label: 'Gerar Proposta', icon: I('M5 6h6M5 9h4M8 12v-1', <path d="M13 2H3a1 1 0 00-1 1v10a1 1 0 001 1h10a1 1 0 001-1V3a1 1 0 00-1-1z" stroke="currentColor" strokeWidth="1.5"/>) },
  ]},
  { section: 'Gestão', items: [
    { to: '/gestao', label: 'Central de Gestão', icon: I('M8 1l1.5 3 3.5.5-2.5 2.5.5 3.5L8 9l-3 1.5.5-3.5L3 4.5l3.5-.5L8 1z') },
    { to: '/dados', label: 'Dados & LGPD', icon: I('M5 8h6M5 5h6M5 11h3', <rect x="2" y="2" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1.5"/>) },
  ]},
]

export default function Layout() {
  const navigate = useNavigate()
  const [cmdOpen, setCmdOpen] = useState(false)
  const [drawer, setDrawer] = useState(false)

  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setCmdOpen(o => !o)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const handleLogout = async () => {
    await authAPI.logout()
    navigate('/login')
  }

  return (
    <div className="shell">
      <div className="flow-line" />

      {drawer && <div className="sidebar-backdrop" onClick={() => setDrawer(false)} />}

      <aside className={`sidebar${drawer ? ' open' : ''}`}>
        <div style={{ padding: '20px 18px 16px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: 19, fontWeight: 700, color: 'var(--text1)', letterSpacing: '-0.02em' }}>
              Flow<span style={{ color: 'var(--accent)' }}>CRM</span>
            </span>
            <span style={{ width: 5, height: 5, borderRadius: 1.5, background: 'var(--grad-brand)' }} />
          </div>
          <div className="eyebrow" style={{ marginTop: 3 }}>Agency OS</div>
        </div>

        <nav style={{ padding: '12px 10px', flex: 1, overflowY: 'auto' }}>
          {NAV.map(group => (
            <div key={group.section} style={{ marginBottom: 10 }}>
              <div className="eyebrow" style={{ padding: '0 12px', marginBottom: 6, marginTop: 8 }}>{group.section}</div>
              {group.items.map(item => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.exact}
                  className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
                  onClick={() => setDrawer(false)}
                >
                  {item.icon}
                  {item.label}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        <div style={{ padding: '12px 14px', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'var(--grad-brand)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: 'var(--on-accent)', flexShrink: 0 }}>
            FA
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text1)' }}>Flow Agency</div>
            <button onClick={handleLogout} style={{ background: 'none', border: 'none', padding: 0, fontSize: 11, color: 'var(--text3)' }}
              onMouseEnter={e => e.currentTarget.style.color = 'var(--red)'}
              onMouseLeave={e => e.currentTarget.style.color = 'var(--text3)'}>
              Sair →
            </button>
          </div>
        </div>
      </aside>

      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <header className="topbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button className="btn-ghost btn" onClick={() => setDrawer(true)} style={{ display: 'none', padding: '6px 9px' }} id="hamburger">☰</button>
            <button className="search-trigger" onClick={() => setCmdOpen(true)}>
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none"><circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.5"/><path d="M11 11l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
              <span className="hint" style={{ flex: 1, textAlign: 'left' }}>Buscar em tudo...</span>
              <span className="kbd">Ctrl K</span>
            </button>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className="live-dot" />
            <span style={{ fontSize: 11, color: 'var(--text3)' }}>Dados ao vivo</span>
          </div>
        </header>

        <div style={{ flex: 1, overflowY: 'auto', padding: 22 }}>
          <Outlet />
        </div>
      </main>

      <CommandPalette open={cmdOpen} onClose={() => setCmdOpen(false)} />
      <Toaster />

      <style>{`@media (max-width: 900px) { #hamburger { display: inline-flex !important; } }`}</style>
    </div>
  )
}
