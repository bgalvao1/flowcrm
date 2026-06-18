import React, { useState, useEffect } from 'react'
import { supabase } from './supabase.js'

const EDGE_URL = 'https://zsqsmgewvyxbtahqnigk.supabase.co/functions/v1/send-reset-email'

// ── Solicitar reset ───────────────────────────────────────
export function EsqueceuSenha({ tabela, onVoltar, tema = 'dark' }) {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [enviado, setEnviado] = useState(false)
  const [erro, setErro] = useState('')

  const C = tema === 'blue'
    ? { accent: '#00B4D8', grad: 'linear-gradient(135deg,#00B4D8,#0077A8)', bg: '#0F1A20', border: '#1F3545', text2: '#7FA8BC', text3: '#3D6478', onAccent: '#fff' }
    : { accent: '#E2C078', grad: 'linear-gradient(135deg,#E2C078,#D98E4A)', bg: '#131A15', border: '#2B382F', text2: '#9CAC9F', text3: '#5D6C60', onAccent: '#181208' }

  const inp = { width: '100%', background: tema === 'blue' ? '#162330' : '#1A231C', border: `1px solid ${C.border}`, borderRadius: 7, padding: '9px 12px', color: '#EEF3EE', fontSize: 12, outline: 'none', fontFamily: 'DM Sans, sans-serif', boxSizing: 'border-box' }

  async function enviar(e) {
    e.preventDefault()
    setErro(''); setLoading(true)
    const base_url = window.location.href.split('?')[0]
    try {
      await fetch(EDGE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase(), tabela, base_url })
      })
      setEnviado(true)
    } catch {
      setErro('Erro ao enviar. Tente novamente.')
    }
    setLoading(false)
  }

  if (enviado) {
    return (
      <div style={{ textAlign: 'center', padding: '20px 0' }}>
        <div style={{ fontSize: 36, marginBottom: 12 }}>📧</div>
        <div style={{ fontSize: 14, fontWeight: 700, color: '#EEF3EE', marginBottom: 8 }}>E-mail enviado!</div>
        <div style={{ fontSize: 12, color: C.text2, lineHeight: 1.6, marginBottom: 20 }}>
          Se o e-mail <strong style={{ color: C.accent }}>{email}</strong> estiver cadastrado, você receberá um link para redefinir sua senha em até 5 minutos.<br /><br />
          O link expira em <strong>30 minutos</strong>.
        </div>
        <button onClick={onVoltar} style={{ background: 'none', border: `1px solid ${C.border}`, borderRadius: 7, padding: '8px 16px', fontSize: 12, color: C.text2, cursor: 'pointer' }}>
          ← Voltar ao login
        </button>
      </div>
    )
  }

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: '#EEF3EE', marginBottom: 4 }}>Esqueceu a senha?</div>
        <div style={{ fontSize: 12, color: C.text2, lineHeight: 1.5 }}>
          Informe o e-mail cadastrado. Enviaremos um link para você criar uma nova senha.
        </div>
      </div>
      <form onSubmit={enviar}>
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 10, color: C.text3, display: 'block', marginBottom: 4, letterSpacing: '0.8px', textTransform: 'uppercase', fontWeight: 600 }}>E-mail cadastrado</label>
          <input value={email} onChange={e => setEmail(e.target.value)} type="email" required placeholder="seu@email.com" style={inp} autoFocus />
        </div>
        {erro && <div style={{ fontSize: 11, color: '#E8645B', marginBottom: 12, background: 'rgba(232,100,91,0.08)', border: '1px solid rgba(232,100,91,0.2)', borderRadius: 6, padding: '8px 12px' }}>{erro}</div>}
        <button type="submit" disabled={loading}
          style={{ width: '100%', background: C.grad, border: 'none', borderRadius: 8, padding: 11, fontSize: 13, fontWeight: 700, color: C.onAccent, cursor: 'pointer', opacity: loading ? 0.7 : 1, marginBottom: 12 }}>
          {loading ? 'Enviando...' : 'Enviar link de recuperação'}
        </button>
        <button type="button" onClick={onVoltar}
          style={{ width: '100%', background: 'none', border: `1px solid ${C.border}`, borderRadius: 8, padding: 10, fontSize: 12, color: C.text2, cursor: 'pointer' }}>
          ← Voltar
        </button>
      </form>
    </div>
  )
}

// ── Redefinir senha (abre quando há ?reset=token na URL) ───
export function RedefinirSenha({ tabela, onConcluido, tema = 'dark' }) {
  const [token, setToken] = useState('')
  const [novaSenha, setNovaSenha] = useState('')
  const [confirmar, setConfirmar] = useState('')
  const [erro, setErro] = useState('')
  const [loading, setLoading] = useState(false)
  const [concluido, setConcluido] = useState(false)
  const [tokenValido, setTokenValido] = useState(null) // null=verificando, true, false

  const C = tema === 'blue'
    ? { accent: '#00B4D8', grad: 'linear-gradient(135deg,#00B4D8,#0077A8)', bg: '#0F1A20', border: '#1F3545', text2: '#7FA8BC', text3: '#3D6478', onAccent: '#fff' }
    : { accent: '#E2C078', grad: 'linear-gradient(135deg,#E2C078,#D98E4A)', bg: '#131A15', border: '#2B382F', text2: '#9CAC9F', text3: '#5D6C60', onAccent: '#181208' }

  const inp = { width: '100%', background: tema === 'blue' ? '#162330' : '#1A231C', border: `1px solid ${C.border}`, borderRadius: 7, padding: '9px 12px', color: '#EEF3EE', fontSize: 12, outline: 'none', fontFamily: 'DM Sans, sans-serif', boxSizing: 'border-box' }
  const lbl = { fontSize: 10, color: C.text3, display: 'block', marginBottom: 4, letterSpacing: '0.8px', textTransform: 'uppercase', fontWeight: 600 }

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const t = params.get('reset')
    if (t) {
      setToken(t)
      validarToken(t)
    }
  }, [])

  async function validarToken(t) {
    const { data } = await supabase
      .from('password_reset_tokens')
      .select('*')
      .eq('token', t)
      .eq('tabela', tabela)
      .eq('usado', false)
      .single()
    if (!data || new Date(data.expira_em) < new Date()) {
      setTokenValido(false)
    } else {
      setTokenValido(true)
    }
  }

  async function redefinir(e) {
    e.preventDefault()
    setErro('')
    if (novaSenha !== confirmar) { setErro('As senhas não coincidem.'); return }
    if (novaSenha.length < 6) { setErro('A senha deve ter ao menos 6 caracteres.'); return }
    setLoading(true)

    // Busca o e-mail pelo token
    const { data: tkn } = await supabase
      .from('password_reset_tokens')
      .select('email')
      .eq('token', token)
      .single()

    if (!tkn) { setErro('Token inválido.'); setLoading(false); return }

    // Atualiza senha na tabela correta
    const { error } = await supabase
      .from(tabela)
      .update({ senha: novaSenha })
      .ilike('email', tkn.email)

    if (error) { setErro('Erro ao atualizar. Tente novamente.'); setLoading(false); return }

    // Marca token como usado
    await supabase.from('password_reset_tokens').update({ usado: true }).eq('token', token)

    // Limpa URL
    window.history.replaceState({}, '', window.location.pathname)

    setConcluido(true)
    setLoading(false)
    setTimeout(() => onConcluido?.(), 2500)
  }

  if (!token) return null

  if (tokenValido === null) {
    return <div style={{ textAlign: 'center', padding: 20, color: C.text2, fontSize: 12 }}>Verificando link...</div>
  }

  if (tokenValido === false) {
    return (
      <div style={{ textAlign: 'center', padding: '20px 0' }}>
        <div style={{ fontSize: 36, marginBottom: 12 }}>⚠️</div>
        <div style={{ fontSize: 14, fontWeight: 700, color: '#E8645B', marginBottom: 8 }}>Link inválido ou expirado</div>
        <div style={{ fontSize: 12, color: C.text2, marginBottom: 16, lineHeight: 1.5 }}>
          Este link de recuperação expirou ou já foi utilizado. Solicite um novo.
        </div>
        <button onClick={() => { window.history.replaceState({}, '', window.location.pathname); onConcluido?.() }}
          style={{ background: 'none', border: `1px solid ${C.border}`, borderRadius: 7, padding: '8px 16px', fontSize: 12, color: C.text2, cursor: 'pointer' }}>
          Voltar ao login
        </button>
      </div>
    )
  }

  if (concluido) {
    return (
      <div style={{ textAlign: 'center', padding: '20px 0' }}>
        <div style={{ fontSize: 36, marginBottom: 12 }}>✅</div>
        <div style={{ fontSize: 14, fontWeight: 700, color: '#3DCE8C', marginBottom: 8 }}>Senha redefinida!</div>
        <div style={{ fontSize: 12, color: C.text2 }}>Redirecionando para o login...</div>
      </div>
    )
  }

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: '#EEF3EE', marginBottom: 4 }}>Criar nova senha</div>
        <div style={{ fontSize: 12, color: C.text2 }}>Escolha uma senha com pelo menos 6 caracteres.</div>
      </div>
      <form onSubmit={redefinir}>
        <div style={{ marginBottom: 12 }}>
          <label style={lbl}>Nova senha *</label>
          <input value={novaSenha} onChange={e => setNovaSenha(e.target.value)} type="password" required placeholder="••••••••" style={inp} autoFocus />
        </div>
        <div style={{ marginBottom: 18 }}>
          <label style={lbl}>Confirmar nova senha *</label>
          <input value={confirmar} onChange={e => setConfirmar(e.target.value)} type="password" required placeholder="••••••••" style={inp} />
        </div>
        {erro && <div style={{ fontSize: 11, color: '#E8645B', marginBottom: 12, background: 'rgba(232,100,91,0.08)', border: '1px solid rgba(232,100,91,0.2)', borderRadius: 6, padding: '8px 12px' }}>{erro}</div>}
        <button type="submit" disabled={loading}
          style={{ width: '100%', background: C.grad, border: 'none', borderRadius: 8, padding: 11, fontSize: 13, fontWeight: 700, color: C.onAccent, cursor: 'pointer', opacity: loading ? 0.7 : 1 }}>
          {loading ? 'Salvando...' : 'Salvar nova senha'}
        </button>
      </form>
    </div>
  )
}
