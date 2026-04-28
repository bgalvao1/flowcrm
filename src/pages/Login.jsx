import React, { useState } from 'react'
import { authAPI } from '../lib/supabase.js'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error } = await authAPI.login(email, password)
    if (error) { setError('E-mail ou senha inválidos.'); setLoading(false) }
  }

  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'100vh', background:'var(--bg0)' }}>
      <div style={{ background:'var(--bg2)', border:'1px solid var(--border2)', borderRadius:14, padding:'32px 28px', width:320 }}>
        <div style={{ fontFamily:'Syne, sans-serif', fontSize:22, fontWeight:700, background:'linear-gradient(135deg,#4F7CFF,#7B5CFF)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', marginBottom:4 }}>FlowCRM</div>
        <div style={{ fontSize:12, color:'var(--text3)', marginBottom:24 }}>Agency OS — Acesso restrito</div>
        <form onSubmit={handleLogin}>
          <label style={{ fontSize:11, color:'var(--text3)', display:'block', marginBottom:5, letterSpacing:'0.3px' }}>E-MAIL</label>
          <input value={email} onChange={e => setEmail(e.target.value)} type="email" placeholder="agencia@flow.com.br" required
            style={{ width:'100%', background:'var(--bg3)', border:'1px solid var(--border2)', borderRadius:7, padding:'9px 12px', color:'var(--text1)', fontSize:13, marginBottom:12, outline:'none' }} />
          <label style={{ fontSize:11, color:'var(--text3)', display:'block', marginBottom:5, letterSpacing:'0.3px' }}>SENHA</label>
          <input value={password} onChange={e => setPassword(e.target.value)} type="password" placeholder="••••••••" required
            style={{ width:'100%', background:'var(--bg3)', border:'1px solid var(--border2)', borderRadius:7, padding:'9px 12px', color:'var(--text1)', fontSize:13, marginBottom:16, outline:'none' }} />
          {error && <div style={{ fontSize:11, color:'var(--red)', marginBottom:12, background:'rgba(255,91,91,0.08)', border:'1px solid rgba(255,91,91,0.2)', borderRadius:6, padding:'7px 10px' }}>{error}</div>}
          <button type="submit" disabled={loading} style={{ width:'100%', background:'var(--accent)', border:'none', borderRadius:7, padding:10, fontSize:13, fontWeight:500, color:'#fff', cursor:'pointer', opacity: loading ? 0.7 : 1 }}>
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  )
}
