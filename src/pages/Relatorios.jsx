import React, { useEffect, useState } from 'react'
import { relatoriosAPI, clientesAPI, supabase } from '../lib/supabase.js'
import { toast } from '../lib/toast.js'

const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']
const hoje = new Date()

export default function Relatorios() {
  const [relatorios, setRelatorios] = useState([])
  const [clientes, setClientes] = useState([])
  const [loading, setLoading] = useState(true)
  const [gerando, setGerando] = useState(false)
  const [modal, setModal] = useState(false)
  const [lendo, setLendo] = useState(null)
  const [form, setForm] = useState({ cliente_id: '', mes: hoje.getMonth() + 1, ano: hoje.getFullYear() })

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const [{ data: r }, { data: c }] = await Promise.all([relatoriosAPI.listar(), clientesAPI.listar()])
    setRelatorios(r || [])
    setClientes(c || [])
    setLoading(false)
  }

  async function gerarRelatorio() {
    if (!form.cliente_id) return
    setGerando(true)
    const cliente = clientes.find(c => c.id === form.cliente_id)
    const mesNome = MESES[form.mes - 1]

    // Busca dados do mês
    const ini = `${form.ano}-${String(form.mes).padStart(2,'0')}-01`
    const fim = `${form.ano}-${String(form.mes).padStart(2,'0')}-31`
    const [{ data: deals }, { data: projetos }, { data: lancamentos }] = await Promise.all([
      supabase.from('deals').select('nome, etapa, valor').eq('cliente_id', form.cliente_id),
      supabase.from('projetos').select('nome, etapa, progresso').eq('cliente_id', form.cliente_id),
      supabase.from('lancamentos').select('descricao, valor, tipo').eq('cliente_id', form.cliente_id).gte('data_lancamento', ini).lte('data_lancamento', fim),
    ])

    const contexto = `
Cliente: ${cliente.nome}
Mês de referência: ${mesNome} ${form.ano}
MRR do cliente: R$ ${cliente.mrr || 0}
Deals: ${JSON.stringify(deals || [])}
Projetos em andamento: ${JSON.stringify(projetos || [])}
Lançamentos financeiros do mês: ${JSON.stringify(lancamentos || [])}
`
    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-6',
          max_tokens: 1000,
          messages: [{
            role: 'user',
            content: `Com base nos dados abaixo, gere um relatório mensal profissional para o cliente da Flow Agency (agência de marketing digital). O relatório deve ter: título, resumo executivo, resultados do mês, projetos em andamento, próximos passos e uma mensagem de encerramento. Use um tom profissional e positivo. Dados:\n${contexto}`
          }]
        })
      })
      const data = await res.json()
      const conteudo = data.content?.[0]?.text || ''
      const titulo = `Relatório ${mesNome} ${form.ano} — ${cliente.nome}`
      const { data: rel } = await relatoriosAPI.criar({ cliente_id: form.cliente_id, mes: form.mes, ano: form.ano, titulo, conteudo_ia: conteudo })
      toast.success('Relatório gerado com IA!')
      setModal(false)
      await load()
      setLendo({ ...rel, clientes: cliente })
    } catch {
      toast.error('Erro ao gerar relatório')
    }
    setGerando(false)
  }

  return (
    <div>
      <div className="fade-up" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 className="page-title">Relatórios Mensais</h1>
          <div className="page-sub">Gerados automaticamente com IA por cliente</div>
        </div>
        <button className="btn btn-primary" onClick={() => setModal(true)}>✨ Gerar Relatório com IA</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: lendo ? '300px 1fr' : 'repeat(auto-fill, minmax(300px, 1fr))', gap: 14 }}>
        {/* Lista */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {loading && [1,2].map(i => <div key={i} className="skeleton" style={{ height: 90, borderRadius: 10 }} />)}
          {!loading && relatorios.length === 0 && (
            <div className="card" style={{ textAlign: 'center', padding: 40 }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>📊</div>
              <div style={{ fontSize: 12, color: 'var(--text3)' }}>Nenhum relatório gerado ainda</div>
            </div>
          )}
          {relatorios.map(r => (
            <div key={r.id} className={`card card-hover`}
              style={{ cursor: 'pointer', borderLeft: lendo?.id === r.id ? '3px solid var(--accent)' : '3px solid transparent' }}
              onClick={() => setLendo(r)}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text1)', marginBottom: 3 }}>{r.titulo}</div>
                  <div style={{ fontSize: 11, color: 'var(--text3)' }}>{r.clientes?.nome}</div>
                </div>
                <span className={`badge ${r.status === 'enviado' ? 'badge-green' : 'badge-gold'}`}>{r.status === 'enviado' ? 'Enviado' : 'Rascunho'}</span>
              </div>
              <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 8 }}>
                {MESES[r.mes - 1]} {r.ano} · {new Date(r.criado_em).toLocaleDateString('pt-BR')}
              </div>
            </div>
          ))}
        </div>

        {/* Visualizador */}
        {lendo && (
          <div className="card fade-up">
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
              <div>
                <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 700, color: 'var(--text1)', marginBottom: 4 }}>{lendo.titulo}</h2>
                <div style={{ display: 'flex', gap: 6 }}>
                  <span className="badge badge-gold">{MESES[lendo.mes - 1]} {lendo.ano}</span>
                  <span className={`badge ${lendo.status === 'enviado' ? 'badge-green' : 'badge-sky'}`}>{lendo.status === 'enviado' ? 'Enviado' : 'Rascunho'}</span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button className="btn btn-ghost" style={{ fontSize: 11, padding: '5px 10px' }}
                  onClick={async () => { await relatoriosAPI.atualizar(lendo.id, { status: 'enviado' }); toast.success('Marcado como enviado'); load() }}>
                  Marcar enviado
                </button>
                <button onClick={() => setLendo(null)} style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', fontSize: 16 }}>✕</button>
              </div>
            </div>
            <div style={{ maxHeight: '65vh', overflowY: 'auto', fontSize: 13, color: 'var(--text2)', lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>
              {lendo.conteudo_ia || 'Sem conteúdo.'}
            </div>
          </div>
        )}
      </div>

      {modal && (
        <div className="modal-overlay" onMouseDown={e => { if (e.target === e.currentTarget) setModal(false) }}>
          <div className="modal">
            <div className="modal-title">Gerar Relatório com IA</div>
            <div style={{ marginBottom: 12 }}>
              <label className="label">Cliente *</label>
              <select className="input" value={form.cliente_id} onChange={e => setForm({...form, cliente_id: e.target.value})} autoFocus>
                <option value="">Selecione...</option>
                {clientes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
              <div>
                <label className="label">Mês</label>
                <select className="input" value={form.mes} onChange={e => setForm({...form, mes: Number(e.target.value)})}>
                  {MESES.map((m,i) => <option key={i} value={i+1}>{m}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Ano</label>
                <select className="input" value={form.ano} onChange={e => setForm({...form, ano: Number(e.target.value)})}>
                  {[2024,2025,2026].map(y => <option key={y}>{y}</option>)}
                </select>
              </div>
            </div>
            <div style={{ fontSize: 11, color: 'var(--text3)', background: 'var(--bg3)', borderRadius: 7, padding: '8px 12px', marginBottom: 16 }}>
              A IA vai analisar os deals, projetos e lançamentos do mês para gerar o relatório automaticamente.
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button className="btn btn-ghost" onClick={() => setModal(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={gerarRelatorio} disabled={!form.cliente_id || gerando}>
                {gerando ? '⏳ Gerando...' : '✨ Gerar com IA'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
