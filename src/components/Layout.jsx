import React, { useEffect, useState, createContext, useContext } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { authAPI } from '../lib/supabase.js'
import Toaster from './Toaster.jsx'
import CommandPalette from './CommandPalette.jsx'

// Context global para modo compacto do kanban
export const CompactCtx = createContext(false)
export const useCompact = () => useContext(CompactCtx)

const I = (d, extra) => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">{extra}{d && <path d={d} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />}</svg>
)

const NAV = [
  { section: 'Principal', items: [
    { to: '/', label: 'Dashboard', exact: true, key: null, icon: I(null, <><rect x="1" y="1" width="6" height="6" rx="1.5" fill="currentColor" opacity=".9"/><rect x="9" y="1" width="6" height="6" rx="1.5" fill="currentColor" opacity=".45"/><rect x="1" y="9" width="6" height="6" rx="1.5" fill="currentColor" opacity=".45"/><rect x="9" y="9" width="6" height="6" rx="1.5" fill="currentColor" opacity=".7"/></>) },
    { to: '/pipeline', label: 'Pipeline', key: 'p', icon: I('M1 3h14M1 8h10M1 13h6') },
    { to: '/clientes', label: 'Clientes', key: 'c', icon: I('M1 13c0-2.761 2.239-5 5-5', <><circle cx="6" cy="5" r="3" stroke="currentColor" strokeWidth="1.5"/><circle cx="12" cy="10" r="2.5" stroke="currentColor" strokeWidth="1.3"/></>) },
  ]},
  { section: 'Operação', items: [
    { to: '/projetos', label: 'Projetos', key: 'j', icon: I('M5 6h6M5 9h4', <rect x="1" y="2" width="14" height="12" rx="2" stroke="currentColor" strokeWidth="1.5"/>) },
    { to: '/tarefas', label: 'Tarefas', key: 't', icon: I('M3 8l2.5 2.5L12 5', <rect x="1" y="1" width="14" height="14" rx="2" stroke="currentColor" strokeWidth="1.3"/>) },
    { to: '/agenda', label: 'Agenda', key: 'a', icon: I('M5 1v3M11 1v3M2 7h12', <rect x="2" y="3" width="12" height="11" rx="2" stroke="currentColor" strokeWidth="1.5"/>) },
    { to: '/financeiro', label: 'Financeiro', key: 'f', icon: I('M8 4v8M5.5 6.5C5.5 5.4 6.6 5 8 5s2.5.4 2.5 1.5S9 8 8 8s-2.5.5-2.5 1.5S6.6 11 8 11s2.5-.4 2.5-1.5', <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.5"/>) },
    { to: '/proposta', label: 'Gerar Proposta', key: 'g', icon: I('M5 6h6M5 9h4M8 12v-1', <path d="M13 2H3a1 1 0 00-1 1v10a1 1 0 001 1h10a1 1 0 001-1V3a1 1 0 00-1-1z" stroke="currentColor" strokeWidth="1.5"/>) },
  ]},
  { section: 'Gestão', items: [
    { to: '/gestao', label: 'Central de Gestão', key: null, icon: I('M8 1l1.5 3 3.5.5-2.5 2.5.5 3.5L8 9l-3 1.5.5-3.5L3 4.5l3.5-.5L8 1z') },
    { to: '/dados', label: 'Dados & LGPD', key: null, icon: I('M5 8h6M5 5h6M5 11h3', <rect x="2" y="2" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1.5"/>) },
  ]},
]

// Mapa rápido de atalhos: letra → rota
const ATALHOS = {}
NAV.forEach(g => g.items.forEach(i => { if (i.key) ATALHOS[i.key] = i.to }))

export default function Layout() {
  const navigate = useNavigate()
  const [cmdOpen, setCmdOpen] = useState(false)
  const [drawer, setDrawer] = useState(false)
  const [compact, setCompact] = useState(() => localStorage.getItem('flowcrm-compact') === '1')
  const [shortcutsHint, setShortcutsHint] = useState(false)

  useEffect(() => {
    const onKey = (e) => {
      const tag = document.activeElement?.tagName
      const typing = ['INPUT', 'TEXTAREA', 'SELECT'].includes(tag) || document.activeElement?.isContentEditable
      if (typing) return

      // Ctrl+K — command palette
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault(); setCmdOpen(o => !o); return
      }
      // ? — mostrar dica de atalhos
      if (e.key === '?') { setShortcutsHint(h => !h); return }

      // Atalhos de navegação: letra simples
      if (!e.ctrlKey && !e.metaKey && !e.altKey && ATALHOS[e.key]) {
        navigate(ATALHOS[e.key])
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [navigate])

  const handleLogout = async () => { await authAPI.logout(); navigate('/login') }

  function toggleCompact() {
    setCompact(c => {
      const next = !c
      localStorage.setItem('flowcrm-compact', next ? '1' : '0')
      return next
    })
  }

  return (
    <CompactCtx.Provider value={compact}>
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
                    style={{ justifyContent: 'space-between' }}
                  >
                    <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      {item.icon}{item.label}
                    </span>
                    {item.key && (
                      <span className="kbd" style={{ fontSize: 9, opacity: 0.5 }}>{item.key}</span>
                    )}
                  </NavLink>
                ))}
              </div>
            ))}
          </nav>

          <div style={{ padding: '10px 14px', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10 }}>
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
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {/* Modo compacto do kanban */}
              <button
                onClick={toggleCompact}
                title={compact ? 'Modo normal' : 'Modo compacto'}
                style={{ background: compact ? 'var(--gold-14)' : 'transparent', border: '1px solid var(--border2)', borderRadius: 6, padding: '4px 8px', cursor: 'pointer', fontSize: 10, color: compact ? 'var(--accent)' : 'var(--text3)', display: 'flex', alignItems: 'center', gap: 5, transition: 'all 0.15s' }}
              >
                <svg width="12" height="12" viewBox="0 0 16 16" fill="none"><rect x="1" y="1" width="14" height="3" rx="1" fill="currentColor" opacity=".8"/><rect x="1" y="6" width="14" height="3" rx="1" fill="currentColor" opacity=".6"/><rect x="1" y="11" width="14" height="3" rx="1" fill="currentColor" opacity=".4"/></svg>
                {compact ? 'Compacto' : 'Normal'}
              </button>
              {/* Dica de atalhos */}
              <button
                onClick={() => setShortcutsHint(h => !h)}
                title="Atalhos de teclado (?)"
                style={{ background: 'transparent', border: '1px solid var(--border2)', borderRadius: 6, padding: '4px 8px', cursor: 'pointer', fontSize: 10, color: 'var(--text3)', transition: 'all 0.15s' }}
              >
                ?
              </button>
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

        {/* Modal de atalhos */}
        {shortcutsHint && (
          <div className="modal-overlay" onMouseDown={e => { if (e.target === e.currentTarget) setShortcutsHint(false) }}>
            <div className="modal" style={{ width: 360 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <div className="modal-title" style={{ marginBottom: 0 }}>Atalhos de teclado</div>
                <button onClick={() => setShortcutsHint(false)} style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', fontSize: 16 }}>✕</button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {[
                  ['Ctrl K', 'Busca global'],
                  ['?', 'Ver atalhos'],
                  ['P', 'Pipeline'],
                  ['C', 'Clientes'],
                  ['T', 'Tarefas'],
                  ['J', 'Projetos'],
                  ['A', 'Agenda'],
                  ['F', 'Financeiro'],
                  ['G', 'Proposta IA'],
                ].map(([k, v]) => (
                  <div key={k} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg3)', borderRadius: 7, padding: '8px 10px' }}>
                    <span style={{ fontSize: 12, color: 'var(--text2)' }}>{v}</span>
                    <span className="kbd">{k}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        <style>{`@media (max-width: 900px) { #hamburger { display: inline-flex !important; } }`}</style>
      </div>
    </CompactCtx.Provider>
  )
}
