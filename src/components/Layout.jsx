import React from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { authAPI } from '../lib/supabase.js'

const navItems = [
  { to: '/', label: 'Dashboard', exact: true, icon: <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="1" y="1" width="6" height="6" rx="1.5" fill="currentColor" opacity=".9"/><rect x="9" y="1" width="6" height="6" rx="1.5" fill="currentColor" opacity=".5"/><rect x="1" y="9" width="6" height="6" rx="1.5" fill="currentColor" opacity=".5"/><rect x="9" y="9" width="6" height="6" rx="1.5" fill="currentColor" opacity=".7"/></svg> },
  { to: '/pipeline', label: 'Pipeline', icon: <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M1 3h14M1 8h10M1 13h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg> },
  { to: '/clientes', label: 'Clientes', icon: <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="6" cy="5" r="3" stroke="currentColor" strokeWidth="1.5"/><path d="M1 13c0-2.761 2.239-5 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><circle cx="12" cy="10" r="2.5" stroke="currentColor" strokeWidth="1.3"/></svg> },
  { to: '/projetos', label: 'Projetos', icon: <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="1" y="2" width="14" height="12" rx="2" stroke="currentColor" strokeWidth="1.5"/><path d="M5 6h6M5 9h4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg> },
  { to: '/financeiro', label: 'Financeiro', icon: <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.5"/><path d="M8 4v8M5.5 6.5C5.5 5.4 6.6 5 8 5s2.5.4 2.5 1.5S9 8 8 8s-2.5.5-2.5 1.5S6.6 11 8 11s2.5-.4 2.5-1.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg> },
  { to: '/proposta', label: 'Gerar Proposta', icon: <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M13 2H3a1 1 0 00-1 1v10a1 1 0 001 1h10a1 1 0 001-1V3a1 1 0 00-1-1z" stroke="currentColor" strokeWidth="1.5"/><path d="M5 6h6M5 9h4M8 12v-1" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg> },
  { to: '/agenda', label: 'Agenda', icon: <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="2" y="3" width="12" height="11" rx="2" stroke="currentColor" strokeWidth="1.5"/><path d="M5 1v3M11 1v3M2 7h12" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg> },
  { to: '/dados', label: 'Dados & LGPD', icon: <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="2" y="2" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1.5"/><path d="M5 8h6M5 5h6M5 11h3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg> },
]

const s = {
  wrap: { display:'flex', height:'100vh', overflow:'hidden' },
  sidebar: { width:220, minWidth:220, background:'var(--bg1)', borderRight:'1px solid var(--border)', display:'flex', flexDirection:'column', height:'100vh' },
  logo: { padding:'20px 18px 16px', borderBottom:'1px solid var(--border)' },
  logoText: { fontFamily:'Syne, sans-serif', fontSize:18, fontWeight:700, background:'linear-gradient(135deg, #4F7CFF, #7B5CFF)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' },
  logoBadge: { fontSize:10, color:'var(--text3)', letterSpacing:'0.5px', marginTop:1 },
  nav: { padding:'12px 10px', flex:1, overflowY:'auto' },
  navLabel: { fontSize:10, color:'var(--text3)', letterSpacing:'1px', padding:'0 8px', marginBottom:6, marginTop:8 },
  main: { flex:1, display:'flex', flexDirection:'column', overflow:'hidden' },
  content: { flex:1, overflowY:'auto', padding:20 },
  userRow: { padding:'10px 18px', borderTop:'1px solid var(--border)', display:'flex', alignItems:'center', gap:10 },
  avatar: { width:30, height:30, borderRadius:'50%', background:'linear-gradient(135deg,#4F7CFF,#7B5CFF)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:600, color:'#fff', flexShrink:0 },
}

export default function Layout() {
  const navigate = useNavigate()

  const handleLogout = async () => {
    await authAPI.logout()
    navigate('/login')
  }

  return (
    <div style={s.wrap}>
      <aside style={s.sidebar}>
        <div style={s.logo}>
          <div style={s.logoText}>FlowCRM</div>
          <div style={s.logoBadge}>AGENCY OS</div>
        </div>
        <nav style={s.nav}>
          <div style={s.navLabel}>PRINCIPAL</div>
          {navItems.slice(0,3).map(item => (
            <NavLink key={item.to} to={item.to} end={item.exact} style={({ isActive }) => ({
              display:'flex', alignItems:'center', gap:10, padding:'9px 10px', borderRadius:8,
              color: isActive ? 'var(--accent)' : 'var(--text2)',
              background: isActive ? 'var(--bg3)' : 'none',
              fontWeight: isActive ? 500 : 400, fontSize:13, transition:'all 0.15s'
            })}>
              {item.icon}{item.label}
            </NavLink>
          ))}
          <div style={{ ...s.navLabel, marginTop:16 }}>TRABALHO</div>
          {navItems.slice(3,5).map(item => (
            <NavLink key={item.to} to={item.to} style={({ isActive }) => ({
              display:'flex', alignItems:'center', gap:10, padding:'9px 10px', borderRadius:8,
              color: isActive ? 'var(--accent)' : 'var(--text2)',
              background: isActive ? 'var(--bg3)' : 'none',
              fontWeight: isActive ? 500 : 400, fontSize:13, transition:'all 0.15s'
            })}>
              {item.icon}{item.label}
            </NavLink>
          ))}
          <div style={{ ...s.navLabel, marginTop:16 }}>IA</div>
          {navItems.slice(5).map(item => (
            <NavLink key={item.to} to={item.to} style={({ isActive }) => ({
              display:'flex', alignItems:'center', gap:10, padding:'9px 10px', borderRadius:8,
              color: isActive ? 'var(--accent)' : 'var(--text2)',
              background: isActive ? 'var(--bg3)' : 'none',
              fontWeight: isActive ? 500 : 400, fontSize:13, transition:'all 0.15s'
            })}>
              {item.icon}{item.label}
            </NavLink>
          ))}
        </nav>
        <div style={s.userRow}>
          <div style={s.avatar}>AG</div>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:12, fontWeight:500 }}>Flow Agency</div>
            <div style={{ fontSize:10, color:'var(--text3)' }}>Administrador</div>
          </div>
          <button onClick={handleLogout} style={{ background:'none', border:'none', color:'var(--text3)', fontSize:11, cursor:'pointer' }}>Sair</button>
        </div>
      </aside>
      <main style={s.main}>
        <div style={s.content}>
          <Outlet />
        </div>
      </main>
    </div>
  )
}
