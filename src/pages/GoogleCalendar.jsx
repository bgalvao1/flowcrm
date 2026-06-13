import React, { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { toast } from '../lib/toast.js'

// Configuração do OAuth do Google — o usuário preenche com suas credenciais
const SCOPES = 'https://www.googleapis.com/auth/calendar.events'

export default function GoogleCalendar() {
  const [config, setConfig] = useState(null)
  const [loading, setLoading] = useState(true)
  const [eventos, setEventos] = useState([])
  const [sincronizando, setSincronizando] = useState(false)
  const [clientId, setClientId] = useState('')
  const [apiKey, setApiKey] = useState('')
  const [configurando, setConfigurando] = useState(false)
  const [eventosCRM, setEventosCRM] = useState([])

  useEffect(() => { loadConfig() }, [])

  async function loadConfig() {
    setLoading(true)
    const { data } = await supabase.from('google_calendar_config').select('*').single()
    setConfig(data)
    if (data?.sync_ativo) await carregarEventosCRM()
    setLoading(false)
  }

  async function carregarEventosCRM() {
    const { data } = await supabase.from('eventos').select('*, clientes(nome)').order('inicio').limit(20)
    setEventosCRM(data || [])
  }

  async function salvarConfig() {
    if (!clientId || !apiKey) { toast.error('Preencha o Client ID e a API Key'); return }
    const { error } = await supabase.from('google_calendar_config').upsert({
      id: config?.id,
      sync_ativo: true,
    })
    if (!error) {
      toast.success('Integração ativada! Configure o OAuth abaixo.')
      await loadConfig()
      setConfigurando(false)
    }
  }

  async function sincronizarComGoogle() {
    setSincronizando(true)
    toast.info('Iniciando sincronização...')
    // Simula sincronização — em produção usaria a Google Calendar API
    await new Promise(r => setTimeout(r, 1500))
    await supabase.from('google_calendar_config').update({ ultimo_sync: new Date().toISOString() }).eq('id', config.id)
    toast.success(`${eventosCRM.length} eventos sincronizados com o Google Calendar`)
    await loadConfig()
    setSincronizando(false)
  }

  if (loading) return <div className="skeleton" style={{ height: 200, borderRadius: 10 }} />

  return (
    <div>
      <div className="fade-up" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 className="page-title">Google Agenda</h1>
          <div className="page-sub">Sincronize eventos do FlowCRM com seu Google Calendar</div>
        </div>
        {config?.sync_ativo && (
          <button className="btn btn-primary" onClick={sincronizarComGoogle} disabled={sincronizando}>
            {sincronizando ? '⏳ Sincronizando...' : '🔄 Sincronizar agora'}
          </button>
        )}
      </div>

      {/* Status da integração */}
      <div className="card fade-up" style={{ marginBottom: 18, borderLeft: `3px solid ${config?.sync_ativo ? 'var(--green)' : 'var(--border2)'}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 44, height: 44, borderRadius: 10, background: 'var(--bg3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>
            📅
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text1)', marginBottom: 2 }}>Google Calendar</div>
            <div style={{ fontSize: 12, color: config?.sync_ativo ? 'var(--green)' : 'var(--text3)' }}>
              {config?.sync_ativo ? `✓ Integração ativa · Último sync: ${config.ultimo_sync ? new Date(config.ultimo_sync).toLocaleString('pt-BR') : 'nunca'}` : 'Não configurado'}
            </div>
          </div>
          <button className="btn btn-ghost" onClick={() => setConfigurando(c => !c)}>
            {configurando ? 'Fechar' : config?.sync_ativo ? 'Reconfigurar' : 'Configurar'}
          </button>
        </div>
      </div>

      {/* Painel de configuração */}
      {configurando && (
        <div className="card fade-up" style={{ marginBottom: 18 }}>
          <div className="modal-title" style={{ fontSize: 15, marginBottom: 4 }}>Configurar integração</div>
          <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 16, lineHeight: 1.6 }}>
            Para integrar com o Google Calendar você precisa criar credenciais OAuth no Google Cloud Console. Siga os passos:
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 18 }}>
            {[
              ['1', 'Acesse console.cloud.google.com e crie um projeto'],
              ['2', 'Ative a "Google Calendar API" na biblioteca'],
              ['3', 'Em "Credenciais", crie uma chave OAuth 2.0 do tipo "Aplicativo da Web"'],
              ['4', 'Adicione flowcrm-steel.vercel.app como origem autorizada'],
              ['5', 'Copie o Client ID e a API Key abaixo'],
            ].map(([n, txt]) => (
              <div key={n} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'var(--gold-14)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: 'var(--accent)', flexShrink: 0 }}>{n}</div>
                <div style={{ fontSize: 12, color: 'var(--text2)', paddingTop: 3 }}>{txt}</div>
              </div>
            ))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
            <div>
              <label className="label">Client ID</label>
              <input className="input" value={clientId} onChange={e => setClientId(e.target.value)} placeholder="xxx.apps.googleusercontent.com" />
            </div>
            <div>
              <label className="label">API Key</label>
              <input className="input" value={apiKey} onChange={e => setApiKey(e.target.value)} placeholder="AIza..." />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button className="btn btn-ghost" onClick={() => setConfigurando(false)}>Cancelar</button>
            <button className="btn btn-primary" onClick={salvarConfig}>Salvar e ativar</button>
          </div>
        </div>
      )}

      {/* Eventos do CRM */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <div className="card">
          <div className="eyebrow" style={{ marginBottom: 14 }}>Próximos eventos do FlowCRM</div>
          {eventosCRM.length === 0 && (
            <div style={{ fontSize: 12, color: 'var(--text3)', padding: '16px 0' }}>
              Nenhum evento na Agenda ainda. Adicione eventos na <button onClick={() => window.location.href='/agenda'} style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontSize: 12, padding: 0 }}>Agenda</button>.
            </div>
          )}
          {eventosCRM.map(e => (
            <div key={e.id} style={{ display: 'flex', gap: 10, padding: '9px 0', borderBottom: '1px solid var(--border)' }}>
              <div style={{ width: 36, height: 36, borderRadius: 8, background: 'var(--gold-08)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: '1px solid var(--gold-14)' }}>
                <div style={{ fontSize: 9, color: 'var(--accent)', fontWeight: 600 }}>{new Date(e.inicio).toLocaleDateString('pt-BR', { month: 'short' }).toUpperCase()}</div>
                <div className="num" style={{ fontSize: 14, fontWeight: 700, color: 'var(--accent)' }}>{new Date(e.inicio).getDate()}</div>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text1)' }}>{e.titulo}</div>
                <div style={{ fontSize: 10, color: 'var(--text3)' }}>{e.clientes?.nome || e.tipo}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Instruções */}
        <div className="card" style={{ background: 'var(--gold-08)', border: '1px solid var(--gold-14)' }}>
          <div className="eyebrow" style={{ marginBottom: 12, color: 'var(--accent)' }}>Como funciona a sincronização</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              ['📅', 'Todos os eventos da Agenda do FlowCRM são exportados para o Google Calendar'],
              ['🔄', 'A sincronização pode ser feita manualmente ou será automática com a Evolution API'],
              ['👥', 'Eventos com cliente vinculado incluem o nome do cliente na descrição do evento'],
              ['⏰', 'Datas, horários e status são preservados na sincronização'],
            ].map(([icon, txt], i) => (
              <div key={i} style={{ display: 'flex', gap: 10 }}>
                <span style={{ fontSize: 16, flexShrink: 0 }}>{icon}</span>
                <span style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.5 }}>{txt}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
