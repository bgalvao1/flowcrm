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
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: 'var(--bg0)', position: 'relative', overflow: 'hidden' }}>
      <div className="flow-line" />

      {/* Fundo decorativo */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: '20%', left: '50%', transform: 'translateX(-50%)', width: 600, height: 600, borderRadius: '50%', background: 'radial-gradient(circle, rgba(226,192,120,0.04) 0%, transparent 70%)' }} />
      </div>

      <div className="card" style={{ width: 340, padding: '32px 28px', animation: 'pop-in 0.3s cubic-bezier(0.2,0.9,0.3,1.2) both', position: 'relative', zIndex: 1 }}>
        <div style={{ marginBottom: 28 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em', marginBottom: 2 }}>
            Flow<span style={{ color: 'var(--accent)' }}>CRM</span>
          </div>
          <div className="eyebrow">Agency OS — Acesso restrito</div>
        </div>

        <form onSubmit={handleLogin}>
          <div style={{ marginBottom: 12 }}>
            <label className="label">E-mail</label>
            <input
              value={email}
              onChange={e => setEmail(e.target.value)}
              type="email"
              placeholder="agencia@flow.com.br"
              required
              className="input"
            />
          </div>
          <div style={{ marginBottom: 18 }}>
            <label className="label">Senha</label>
            <input
              value={password}
              onChange={e => setPassword(e.target.value)}
              type="password"
              placeholder="••••••••"
              required
              className="input"
            />
          </div>

          {error && (
            <div style={{ fontSize: 12, color: 'var(--red)', marginBottom: 14, background: 'rgba(232,100,91,0.08)', border: '1px solid rgba(232,100,91,0.2)', borderRadius: 7, padding: '8px 12px', animation: 'fade-up 0.2s ease both' }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
            style={{ width: '100%', justifyContent: 'center', padding: '10px 16px', fontSize: 13 }}
          >
            {loading ? 'Entrando...' : 'Entrar na plataforma'}
          </button>
        </form>
      </div>
    </div>
  )
}
