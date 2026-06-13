import React, { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase.js'
import { toast } from '../lib/toast.js'

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID
const CLIENT_SECRET = import.meta.env.VITE_GOOGLE_CLIENT_SECRET
const REDIRECT_URI = 'https://flowcrm-steel.vercel.app/google-calendar'
const SCOPES = 'https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/calendar.readonly'

function buildAuthUrl() {
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    response_type: 'code',
    scope: SCOPES,
    access_type: 'offline',
    prompt: 'consent',
  })
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
}

async function trocaCodePorToken(code) {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      redirect_uri: REDIRECT_URI,
      grant_type: 'authorization_code',
    }),
  })
  return res.json()
}

async function refreshToken(refresh) {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      refresh_token: refresh,
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      grant_type: 'refresh_token',
    }),
  })
  return res.json()
}

async function getAccessToken(config) {
  // Verifica se o token ainda é válido (expira em 1h)
  const expiresAt = config.expires_at ? new Date(config.expires_at) : null
  if (expiresAt && expiresAt > new Date()) {
    return config.access_token
  }
  // Renova com refresh token
  const data = await refreshToken(config.refresh_token)
  if (data.access_token) {
    const expires = new Date(Date.now() + (data.expires_in || 3600) * 1000).toISOString()
    await supabase.from('google_calendar_config').update({
      access_token: data.access_token,
      expires_at: expires,
    }).eq('id', config.id)
    return data.access_token
  }
  return null
}

async function listarEventosGoogle(token) {
  const agora = new Date().toISOString()
  const futuro = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${agora}&timeMax=${futuro}&singleEvents=true&orderBy=startTime&maxResults=20`,
    { headers: { Authorization: `Bearer ${token}` } }
  )
  const data = await res.json()
  return data.items || []
}

async function criarEventoGoogle(token, evento) {
  const body = {
    summary: evento.titulo,
    description: evento.descricao || (evento.clientes?.nome ? `Cliente: ${evento.clientes.nome}` : ''),
    start: { dateTime: evento.inicio, timeZone: 'America/Sao_Paulo' },
    end: { dateTime: evento.fim || new Date(new Date(evento.inicio).getTime() + 3600000).toISOString(), timeZone: 'America/Sao_Paulo' },
  }
  const res = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  return res.json()
}

export default function GoogleCalendar() {
  const [config, setConfig] = useState(null)
  const [loading, setLoading] = useState(true)
  const [eventosGoogle, setEventosGoogle] = useState([])
  const [eventosCRM, setEventosCRM] = useState([])
  const [sincronizando, setSincronizando] = useState(false)
  const [sincronizados, setSincronizados] = useState(0)

  useEffect(() => {
    // Verifica se voltou do OAuth com um code na URL
    const params = new URLSearchParams(window.location.search)
    const code = params.get('code')
    if (code) {
      window.history.replaceState({}, '', '/google-calendar')
      handleOAuthCallback(code)
    } else {
      loadConfig()
    }
  }, [])

  async function handleOAuthCallback(code) {
    setLoading(true)
    toast.info('Conectando com o Google...')
    const tokens = await trocaCodePorToken(code)
    if (tokens.access_token) {
      const expires = new Date(Date.now() + (tokens.expires_in || 3600) * 1000).toISOString()
      const { error } = await supabase.from('google_calendar_config').upsert({
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expires_at: expires,
        sync_ativo: true,
        ultimo_sync: new Date().toISOString(),
      })
      if (!error) {
        toast.success('Google Calendar conectado com sucesso!')
      }
    } else {
      toast.error('Erro ao conectar: ' + (tokens.error_description || tokens.error))
    }
    await loadConfig()
  }

  async function loadConfig() {
    setLoading(true)
    const { data } = await supabase.from('google_calendar_config').select('*').single()
    setConfig(data)
    if (data?.sync_ativo && data?.access_token) {
      await carregarEventos(data)
    }
    await carregarEventosCRM()
    setLoading(false)
  }

  async function carregarEventos(cfg) {
    try {
      const token = await getAccessToken(cfg)
      if (!token) return
      const items = await listarEventosGoogle(token)
      setEventosGoogle(items)
    } catch (e) {
      console.error(e)
    }
  }

  async function carregarEventosCRM() {
    const { data } = await supabase.from('eventos').select('*, clientes(nome)').order('inicio').limit(30)
    setEventosCRM(data || [])
  }

  async function sincronizar() {
    if (!config?.access_token) return
    setSincronizando(true)
    setSincronizados(0)
    let count = 0
    try {
      const token = await getAccessToken(config)
      if (!token) { toast.error('Token inválido, reconecte'); setSincronizando(false); return }

      // Envia eventos do CRM para o Google
      for (const ev of eventosCRM) {
        if (!ev.inicio) continue
        await criarEventoGoogle(token, ev)
        count++
        setSincronizados(count)
        await new Promise(r => setTimeout(r, 200)) // respeita rate limit
      }

      // Atualiza timestamp
      await supabase.from('google_calendar_config').update({ ultimo_sync: new Date().toISOString() }).eq('id', config.id)

      // Recarrega eventos do Google
      const items = await listarEventosGoogle(token)
      setEventosGoogle(items)

      toast.success(`${count} eventos sincronizados com o Google Calendar!`)
    } catch (e) {
      toast.error('Erro durante sincronização')
      console.error(e)
    }
    setSincronizando(false)
    await loadConfig()
  }

  async function desconectar() {
    if (!confirm('Desconectar o Google Calendar?')) return
    await supabase.from('google_calendar_config').update({ access_token: null, refresh_token: null, sync_ativo: false }).eq('id', config.id)
    setConfig(c => ({ ...c, sync_ativo: false, access_token: null }))
    setEventosGoogle([])
    toast.success('Google Calendar desconectado')
  }

  const conectar = () => { window.location.href = buildAuthUrl() }

  if (loading) return (
    <div>
      <div className="fade-up" style={{ marginBottom: 24 }}>
        <h1 className="page-title">Google Agenda</h1>
        <div className="page-sub">Conectando...</div>
      </div>
      <div className="skeleton" style={{ height: 120, borderRadius: 10 }} />
    </div>
  )

  const conectado = config?.sync_ativo && config?.access_token

  return (
    <div>
      <div className="fade-up" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 className="page-title">Google Agenda</h1>
          <div className="page-sub">Sincronize eventos do FlowCRM com seu Google Calendar</div>
        </div>
        {conectado && (
          <button className="btn btn-primary" onClick={sincronizar} disabled={sincronizando}>
            {sincronizando ? `⏳ Sincronizando... (${sincronizados}/${eventosCRM.length})` : '🔄 Sincronizar agora'}
          </button>
        )}
      </div>

      {/* Card de status */}
      <div className="card fade-up" style={{ marginBottom: 18, borderLeft: `3px solid ${conectado ? 'var(--green)' : 'var(--border2)'}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, background: 'var(--bg3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, flexShrink: 0 }}>
            📅
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text1)', marginBottom: 2 }}>Google Calendar</div>
            {conectado ? (
              <div style={{ fontSize: 12, color: 'var(--green)' }}>
                ✓ Conectado · Último sync: {config.ultimo_sync ? new Date(config.ultimo_sync).toLocaleString('pt-BR') : 'nunca'}
              </div>
            ) : (
              <div style={{ fontSize: 12, color: 'var(--text3)' }}>Não conectado — clique em "Conectar" para autorizar o acesso</div>
            )}
          </div>
          {conectado ? (
            <button className="btn btn-danger" style={{ fontSize: 11 }} onClick={desconectar}>Desconectar</button>
          ) : (
            <button className="btn btn-primary" onClick={conectar}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z" fill="currentColor" opacity=".3"/><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z" fill="currentColor"/></svg>
              Conectar com Google
            </button>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        {/* Eventos do CRM a sincronizar */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <div className="eyebrow">Eventos do FlowCRM ({eventosCRM.length})</div>
            <span className="badge badge-sky">A sincronizar</span>
          </div>
          {eventosCRM.length === 0 && (
            <div style={{ fontSize: 12, color: 'var(--text3)', padding: '12px 0' }}>
              Nenhum evento na Agenda. <button onClick={() => window.location.href='/agenda'} style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontSize: 12, padding: 0 }}>Criar eventos →</button>
            </div>
          )}
          {eventosCRM.slice(0, 8).map(e => (
            <div key={e.id} style={{ display: 'flex', gap: 10, padding: '9px 0', borderBottom: '1px solid var(--border)' }}>
              <div style={{ width: 38, height: 38, borderRadius: 8, background: 'var(--gold-08)', border: '1px solid var(--gold-14)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <div style={{ fontSize: 8, color: 'var(--accent)', fontWeight: 700, textTransform: 'uppercase' }}>
                  {e.inicio ? new Date(e.inicio).toLocaleDateString('pt-BR', { month: 'short' }) : '—'}
                </div>
                <div className="num" style={{ fontSize: 14, fontWeight: 800, color: 'var(--accent)', lineHeight: 1 }}>
                  {e.inicio ? new Date(e.inicio).getDate() : '—'}
                </div>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.titulo}</div>
                <div style={{ fontSize: 10, color: 'var(--text3)' }}>
                  {e.clientes?.nome || e.tipo || 'Sem cliente'} · {e.inicio ? new Date(e.inicio).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : ''}
                </div>
              </div>
            </div>
          ))}
          {eventosCRM.length > 8 && <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 8 }}>+ {eventosCRM.length - 8} eventos</div>}
        </div>

        {/* Eventos do Google */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <div className="eyebrow">Google Calendar ({eventosGoogle.length})</div>
            {conectado && <span className="badge badge-green">Ao vivo</span>}
          </div>
          {!conectado && (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>🔒</div>
              <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 12 }}>Conecte sua conta Google para ver os eventos</div>
              <button className="btn btn-primary" onClick={conectar}>Conectar com Google</button>
            </div>
          )}
          {conectado && eventosGoogle.length === 0 && (
            <div style={{ fontSize: 12, color: 'var(--text3)', padding: '12px 0' }}>Nenhum evento nos próximos 30 dias</div>
          )}
          {eventosGoogle.map(e => (
            <div key={e.id} style={{ display: 'flex', gap: 10, padding: '9px 0', borderBottom: '1px solid var(--border)' }}>
              <div style={{ width: 38, height: 38, borderRadius: 8, background: 'rgba(61,206,140,0.08)', border: '1px solid rgba(61,206,140,0.2)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <div style={{ fontSize: 8, color: 'var(--green)', fontWeight: 700, textTransform: 'uppercase' }}>
                  {e.start?.dateTime ? new Date(e.start.dateTime).toLocaleDateString('pt-BR', { month: 'short' }) : '—'}
                </div>
                <div className="num" style={{ fontSize: 14, fontWeight: 800, color: 'var(--green)', lineHeight: 1 }}>
                  {e.start?.dateTime ? new Date(e.start.dateTime).getDate() : e.start?.date ? new Date(e.start.date + 'T12:00:00').getDate() : '—'}
                </div>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.summary || 'Sem título'}</div>
                <div style={{ fontSize: 10, color: 'var(--text3)' }}>
                  {e.start?.dateTime ? new Date(e.start.dateTime).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : 'Dia todo'}
                  {e.location && ` · ${e.location}`}
                </div>
              </div>
              {e.htmlLink && (
                <a href={e.htmlLink} target="_blank" rel="noreferrer" style={{ fontSize: 10, color: 'var(--accent)', alignSelf: 'center', flexShrink: 0, textDecoration: 'none' }}>↗</a>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Como funciona */}
      {!conectado && (
        <div className="card fade-up" style={{ marginTop: 14, background: 'var(--gold-08)', border: '1px solid var(--gold-14)' }}>
          <div className="eyebrow" style={{ marginBottom: 12, color: 'var(--accent)' }}>Como funciona a integração</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {[
              ['📅', 'Todos os eventos da Agenda do FlowCRM são exportados para seu Google Calendar'],
              ['🔄', 'Clique em "Sincronizar agora" a qualquer momento para atualizar'],
              ['👥', 'Eventos com cliente vinculado incluem o nome do cliente na descrição'],
              ['🔒', 'A conexão usa OAuth 2.0 seguro — seus dados não ficam armazenados aqui'],
            ].map(([icon, txt], i) => (
              <div key={i} style={{ display: 'flex', gap: 10 }}>
                <span style={{ fontSize: 18, flexShrink: 0 }}>{icon}</span>
                <span style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.5 }}>{txt}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
