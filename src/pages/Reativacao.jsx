import React, { useEffect, useState } from 'react'
import { reativacaoAPI } from '../lib/supabase.js'
import { toast } from '../lib/toast.js'

export default function Reativacao() {
  const [inativos, setInativos] = useState([])
  const [dias, setDias] = useState(60)
  const [loading, setLoading] = useState(true)
  const [gerando, setGerando] = useState(null)
  const [mensagens, setMensagens] = useState({})

  useEffect(() => { load() }, [dias])

  async function load() {
    setLoading(true)
    const { data } = await reativacaoAPI.clientes_inativos(dias)
    setInativos(data || [])
    setLoading(false)
  }

  async function gerarMensagem(cliente) {
    setGerando(cliente.id)
    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-6',
          max_tokens: 300,
          messages: [{
            role: 'user',
            content: `Crie uma mensagem de reativação curta e natural (máximo 3 linhas) para o WhatsApp para o cliente "${cliente.nome}" que está inativo há mais de ${dias} dias. A mensagem deve ser da Flow Agency, amigável e sem ser genérica. Retorne APENAS o texto da mensagem, sem explicações.`
          }]
        })
      })
      const data = await res.json()
      const texto = data.content?.[0]?.text || ''
      setMensagens(m => ({ ...m, [cliente.id]: texto }))
    } catch {
      toast.error('Erro ao gerar mensagem')
    }
    setGerando(null)
  }

  function copiarMensagem(id) {
    const texto = mensagens[id]
    if (!texto) return
    navigator.clipboard.writeText(texto)
    toast.success('Mensagem copiada!')
  }

  return (
    <div>
      <div className="fade-up" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 className="page-title">Campanhas de Reativação</h1>
          <div className="page-sub">Clientes inativos com mensagem personalizada por IA</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 12, color: 'var(--text3)' }}>Inativos há mais de</span>
          <select className="input" style={{ width: 100 }} value={dias} onChange={e => setDias(Number(e.target.value))}>
            {[30,45,60,90,120].map(d => <option key={d} value={d}>{d} dias</option>)}
          </select>
        </div>
      </div>

      {/* Resumo */}
      <div className="card fade-up" style={{ display: 'flex', alignItems: 'center', gap: 20, padding: '14px 20px', marginBottom: 18, borderLeft: '3px solid var(--red)' }}>
        <div style={{ fontSize: 32 }}>⚠️</div>
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text1)' }}>{inativos.length} clientes inativos</div>
          <div style={{ fontSize: 12, color: 'var(--text3)' }}>Sem interação registrada nos últimos {dias} dias. Gere uma mensagem de reativação com IA para cada um.</div>
        </div>
      </div>

      {loading && <div className="skeleton" style={{ height: 120, borderRadius: 10 }} />}

      {!loading && inativos.length === 0 && (
        <div className="card" style={{ textAlign: 'center', padding: 40 }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>🎉</div>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text1)', marginBottom: 4 }}>Nenhum cliente inativo!</div>
          <div style={{ fontSize: 12, color: 'var(--text3)' }}>Todos os clientes tiveram interação nos últimos {dias} dias</div>
        </div>
      )}

      <div className="stagger" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {inativos.map(c => (
          <div key={c.id} className="card">
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: mensagens[c.id] ? 14 : 0 }}>
              <div style={{ width: 36, height: 36, borderRadius: 9, background: c.cor || 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
                {c.iniciais || '??'}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text1)' }}>{c.nome}</div>
                <div style={{ fontSize: 11, color: 'var(--text3)' }}>
                  Última interação: {c.atualizado_em ? new Date(c.atualizado_em).toLocaleDateString('pt-BR') : 'não registrada'}
                </div>
              </div>
              <button
                className="btn btn-primary"
                style={{ fontSize: 11, padding: '6px 14px' }}
                onClick={() => gerarMensagem(c)}
                disabled={gerando === c.id}
              >
                {gerando === c.id ? '⏳ Gerando...' : mensagens[c.id] ? '↺ Regerar' : '✨ Gerar mensagem'}
              </button>
            </div>

            {mensagens[c.id] && (
              <div style={{ background: 'var(--bg3)', border: '1px solid var(--border2)', borderRadius: 9, padding: '12px 14px', position: 'relative' }}>
                <div style={{ fontSize: 10, color: 'var(--accent)', fontWeight: 600, marginBottom: 6, letterSpacing: '0.5px' }}>MENSAGEM GERADA PELA IA</div>
                <div style={{ fontSize: 13, color: 'var(--text1)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{mensagens[c.id]}</div>
                <button
                  onClick={() => copiarMensagem(c.id)}
                  className="btn btn-ghost"
                  style={{ marginTop: 10, fontSize: 11, padding: '5px 12px' }}
                >
                  📋 Copiar mensagem
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
