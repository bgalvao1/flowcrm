import React, { useEffect, useState } from 'react'
import { indicacoesAPI, clientesAPI } from '../lib/supabase.js'
import { toast } from '../lib/toast.js'

const STATUS_COR = { pendente: 'var(--amber)', convertido: 'var(--green)', perdido: 'var(--red)' }
const STATUS_LABEL = { pendente: 'Pendente', convertido: 'Convertido', perdido: 'Perdido' }

export default function Indicacoes() {
  const [indicacoes, setIndicacoes] = useState([])
  const [clientes, setClientes] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({ cliente_indicador_id: '', cliente_indicado_id: '', nome_indicado: '', status: 'pendente', comissao_pct: '10', observacao: '' })
  const [saving, setSaving] = useState(false)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const [{ data: i }, { data: c }] = await Promise.all([indicacoesAPI.listar(), clientesAPI.listar()])
    setIndicacoes(i || [])
    setClientes(c || [])
    setLoading(false)
  }

  async function handleSave() {
    if (!form.cliente_indicador_id) return
    setSaving(true)
    const { error } = await indicacoesAPI.criar({ ...form, comissao_pct: parseFloat(form.comissao_pct) || 0 })
    setSaving(false)
    if (error) { toast.error('Erro ao salvar'); return }
    toast.success('Indicação registrada')
    setModal(false)
    setForm({ cliente_indicador_id: '', cliente_indicado_id: '', nome_indicado: '', status: 'pendente', comissao_pct: '10', observacao: '' })
    await load()
  }

  async function mudarStatus(id, status) {
    setIndicacoes(is => is.map(i => i.id === id ? { ...i, status } : i))
    await indicacoesAPI.atualizar(id, { status })
    toast.success(`Status: ${STATUS_LABEL[status]}`)
  }

  const totalComissoes = indicacoes.filter(i => i.status === 'convertido').reduce((a, i) => a + Number(i.comissao_valor || 0), 0)
  const convertidas = indicacoes.filter(i => i.status === 'convertido').length
  const pendentes = indicacoes.filter(i => i.status === 'pendente').length

  // Top indicadores
  const ranking = clientes.map(c => ({
    ...c,
    total: indicacoes.filter(i => i.cliente_indicador_id === c.id).length,
    convertidas: indicacoes.filter(i => i.cliente_indicador_id === c.id && i.status === 'convertido').length,
  })).filter(c => c.total > 0).sort((a, b) => b.total - a.total)

  return (
    <div>
      <div className="fade-up" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 className="page-title">Indicações</h1>
          <div className="page-sub">Rastreamento de clientes indicados e comissões</div>
        </div>
        <button className="btn btn-primary" onClick={() => setModal(true)}>+ Registrar Indicação</button>
      </div>

      {/* Métricas */}
      <div className="stagger" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 18 }}>
        {[
          { label: 'Total de Indicações', value: indicacoes.length, cor: 'var(--sky)' },
          { label: 'Pendentes', value: pendentes, cor: 'var(--amber)' },
          { label: 'Convertidas', value: convertidas, cor: 'var(--green)' },
          { label: 'Comissões geradas', value: `R$ ${totalComissoes.toLocaleString('pt-BR')}`, cor: 'var(--accent)' },
        ].map((m, i) => (
          <div key={i} className="card" style={{ borderTop: `2px solid ${m.cor}` }}>
            <div className="eyebrow" style={{ marginBottom: 4 }}>{m.label}</div>
            <div className="num" style={{ fontSize: 20, fontWeight: 700 }}>{m.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 14 }}>
        {/* Tabela */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)' }}>
            <div className="eyebrow">Todas as indicações</div>
          </div>
          {loading ? <div className="skeleton" style={{ height: 100, margin: 16 }} /> : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead><tr>
                {['Quem Indicou','Indicado','Status','Comissão %','Observação','Ação'].map(h => (
                  <th key={h} style={{ fontSize: 10, color: 'var(--text3)', padding: '8px 14px', borderBottom: '1px solid var(--border)', textAlign: 'left', fontWeight: 500 }}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {indicacoes.length === 0 && <tr><td colSpan={6} style={{ padding: 20, color: 'var(--text3)', fontSize: 12 }}>Nenhuma indicação registrada ainda</td></tr>}
                {indicacoes.map(i => (
                  <tr key={i.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '10px 14px', fontSize: 12, fontWeight: 500 }}>{i.clientes_indicador?.nome || '—'}</td>
                    <td style={{ padding: '10px 14px', fontSize: 12 }}>{i.clientes_indicado?.nome || i.nome_indicado || '—'}</td>
                    <td style={{ padding: '10px 14px' }}>
                      <select value={i.status} onChange={e => mudarStatus(i.id, e.target.value)}
                        style={{ background: `${STATUS_COR[i.status]}18`, border: `1px solid ${STATUS_COR[i.status]}44`, borderRadius: 6, padding: '3px 8px', fontSize: 11, color: STATUS_COR[i.status], cursor: 'pointer', fontWeight: 600 }}>
                        {Object.entries(STATUS_LABEL).map(([k,v]) => <option key={k} value={k}>{v}</option>)}
                      </select>
                    </td>
                    <td style={{ padding: '10px 14px', fontSize: 12, color: 'var(--accent)', fontFamily: 'var(--font-mono)' }}>{i.comissao_pct}%</td>
                    <td style={{ padding: '10px 14px', fontSize: 11, color: 'var(--text3)', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{i.observacao || '—'}</td>
                    <td style={{ padding: '10px 14px', fontSize: 10, color: 'var(--text3)' }}>{new Date(i.criado_em).toLocaleDateString('pt-BR')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Ranking */}
        <div className="card">
          <div className="eyebrow" style={{ marginBottom: 12 }}>🏆 Ranking de indicadores</div>
          {ranking.length === 0 && <div style={{ fontSize: 12, color: 'var(--text3)' }}>Nenhum indicador ainda</div>}
          {ranking.map((c, idx) => (
            <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
              <div style={{ width: 22, height: 22, borderRadius: 6, background: idx === 0 ? 'var(--grad-brand)' : 'var(--bg4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: idx === 0 ? 'var(--on-accent)' : 'var(--text3)', flexShrink: 0 }}>
                {idx + 1}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, fontWeight: 500 }}>{c.nome}</div>
                <div style={{ fontSize: 10, color: 'var(--text3)' }}>{c.convertidas} convertidas / {c.total} total</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {modal && (
        <div className="modal-overlay" onMouseDown={e => { if (e.target === e.currentTarget) setModal(false) }}>
          <div className="modal">
            <div className="modal-title">Registrar Indicação</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
              <div style={{ gridColumn: '1/-1' }}>
                <label className="label">Cliente que indicou *</label>
                <select className="input" value={form.cliente_indicador_id} onChange={e => setForm({...form, cliente_indicador_id: e.target.value})} autoFocus>
                  <option value="">Selecione...</option>
                  {clientes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Indicado (cliente existente)</label>
                <select className="input" value={form.cliente_indicado_id} onChange={e => setForm({...form, cliente_indicado_id: e.target.value})}>
                  <option value="">—</option>
                  {clientes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Nome do indicado (novo lead)</label>
                <input className="input" value={form.nome_indicado} onChange={e => setForm({...form, nome_indicado: e.target.value})} placeholder="Se ainda não é cliente" />
              </div>
              <div>
                <label className="label">Comissão (%)</label>
                <input className="input num" type="number" value={form.comissao_pct} onChange={e => setForm({...form, comissao_pct: e.target.value})} />
              </div>
              <div>
                <label className="label">Status</label>
                <select className="input" value={form.status} onChange={e => setForm({...form, status: e.target.value})}>
                  {Object.entries(STATUS_LABEL).map(([k,v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div style={{ gridColumn: '1/-1' }}>
                <label className="label">Observação</label>
                <input className="input" value={form.observacao} onChange={e => setForm({...form, observacao: e.target.value})} placeholder="Contexto da indicação..." />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button className="btn btn-ghost" onClick={() => setModal(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={!form.cliente_indicador_id || saving}>{saving ? 'Salvando...' : 'Registrar'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
