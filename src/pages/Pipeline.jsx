import React, { useEffect, useRef, useState } from 'react'
import { pipelineAPI, clientesAPI } from '../lib/supabase.js'
import { toast } from '../lib/toast.js'

const ETAPAS = [
  { id: 'prospeccao', label: 'Prospecção', cor: '#8B9A8E' },
  { id: 'qualificacao', label: 'Qualificação', cor: '#5FB7E8' },
  { id: 'proposta', label: 'Proposta', cor: '#EFB454' },
  { id: 'fechado', label: 'Fechado', cor: '#3DCE8C' },
  { id: 'perdido', label: 'Perdido', cor: '#E8645B' },
]
const SERVICOS = ['Tráfego Pago', 'Site', 'Landing Page', 'Agente IA', 'App Mobile', 'SaaS', 'Consultoria', 'Redes Sociais']

const fmtBRL = (v) => `R$ ${Number(v || 0).toLocaleString('pt-BR')}`

export default function Pipeline() {
  const [deals, setDeals] = useState([])
  const [clientes, setClientes] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({ nome: '', empresa: '', cliente_id: '', servico: 'Tráfego Pago', etapa: 'prospeccao', valor: '0' })
  const [saving, setSaving] = useState(false)
  const [dragId, setDragId] = useState(null)
  const [overCol, setOverCol] = useState(null)
  const dragCounter = useRef({})

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const [{ data: d }, { data: c }] = await Promise.all([pipelineAPI.listar(), clientesAPI.listar()])
    setDeals(d || [])
    setClientes(c || [])
    setLoading(false)
  }

  async function handleSave() {
    setSaving(true)
    const { error } = await pipelineAPI.criar({ ...form, valor: parseFloat(form.valor) || 0, tag_label: form.servico, tag: 'tag-blue' })
    setSaving(false)
    if (error) { toast.error('Erro ao salvar o deal'); return }
    setModal(false)
    setForm({ nome: '', empresa: '', cliente_id: '', servico: 'Tráfego Pago', etapa: 'prospeccao', valor: '0' })
    toast.success('Deal criado')
    await load()
  }

  // Move com update otimista — UI responde na hora, banco confirma depois
  async function mover(id, etapa) {
    const anterior = deals
    const alvo = ETAPAS.find(e => e.id === etapa)
    setDeals(ds => ds.map(d => d.id === id ? { ...d, etapa } : d))
    const { error } = await pipelineAPI.moverEtapa(id, etapa)
    if (error) {
      setDeals(anterior)
      toast.error('Não foi possível mover — tente de novo')
    } else {
      toast.success(`Movido para ${alvo?.label}`)
    }
  }

  async function deletar(id, nome) {
    if (!window.confirm(`Excluir o deal "${nome}"? Essa ação não pode ser desfeita.`)) return
    const anterior = deals
    setDeals(ds => ds.filter(d => d.id !== id))
    const { error } = await pipelineAPI.deletar(id)
    if (error) { setDeals(anterior); toast.error('Erro ao excluir') }
    else toast.success('Deal excluído')
  }

  // ── Drag and drop ──────────────────────────────────────
  function onDragStart(e, deal) {
    setDragId(deal.id)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', deal.id)
  }
  function onDragEnd() { setDragId(null); setOverCol(null); dragCounter.current = {} }
  function onDragEnter(etapaId) {
    dragCounter.current[etapaId] = (dragCounter.current[etapaId] || 0) + 1
    setOverCol(etapaId)
  }
  function onDragLeave(etapaId) {
    dragCounter.current[etapaId] = (dragCounter.current[etapaId] || 1) - 1
    if (dragCounter.current[etapaId] <= 0) setOverCol(c => (c === etapaId ? null : c))
  }
  function onDrop(e, etapaId) {
    e.preventDefault()
    const id = e.dataTransfer.getData('text/plain') || dragId
    const deal = deals.find(d => String(d.id) === String(id))
    setOverCol(null); setDragId(null); dragCounter.current = {}
    if (deal && deal.etapa !== etapaId) mover(deal.id, etapaId)
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }} className="fade-up">
        <div>
          <h1 className="page-title">Pipeline de Vendas</h1>
          <div className="page-sub">Arraste os cards entre as etapas</div>
        </div>
        <button className="btn btn-primary" onClick={() => setModal(true)}>+ Novo Deal</button>
      </div>

      {/* Totalizadores por etapa */}
      <div className="stagger" style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {ETAPAS.map(e => {
          const etapaDeals = deals.filter(d => d.etapa === e.id)
          const total = etapaDeals.reduce((a, d) => a + Number(d.valor), 0)
          return (
            <div key={e.id} className="card" style={{ padding: '10px 14px', flex: 1, borderTop: `2px solid ${e.cor}` }}>
              <div className="eyebrow" style={{ color: e.cor, marginBottom: 3 }}>{e.label}</div>
              <div className="num" style={{ fontSize: 15, fontWeight: 600 }}>{etapaDeals.length} <span style={{ fontSize: 10, color: 'var(--text3)', fontWeight: 400 }}>deals</span></div>
              {total > 0 && <div className="num" style={{ fontSize: 10, color: 'var(--text3)', marginTop: 1 }}>{fmtBRL(total)}</div>}
            </div>
          )
        })}
      </div>

      {/* Kanban */}
      <div style={{ display: 'flex', gap: 10, overflowX: 'auto', alignItems: 'flex-start', paddingBottom: 8 }}>
        {ETAPAS.map(etapa => {
          const etapaDeals = deals.filter(d => d.etapa === etapa.id)
          return (
            <div
              key={etapa.id}
              className={`kb-col${overCol === etapa.id ? ' drag-over' : ''}`}
              onDragOver={e => { e.preventDefault(); e.dataTransfer.dropEffect = 'move' }}
              onDragEnter={() => onDragEnter(etapa.id)}
              onDragLeave={() => onDragLeave(etapa.id)}
              onDrop={e => onDrop(e, etapa.id)}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: etapa.cor }}>
                  <span style={{ width: 7, height: 7, borderRadius: '50%', background: etapa.cor }} />
                  {etapa.label}
                </div>
                <span className="num" style={{ fontSize: 10, background: 'var(--bg4)', borderRadius: 8, padding: '1px 7px', color: 'var(--text3)' }}>{etapaDeals.length}</span>
              </div>

              {loading && <div className="skeleton" style={{ height: 72, marginBottom: 8 }} />}

              {etapaDeals.map(deal => (
                <div
                  key={deal.id}
                  className={`kb-card${dragId === deal.id ? ' dragging' : ''}`}
                  draggable
                  onDragStart={e => onDragStart(e, deal)}
                  onDragEnd={onDragEnd}
                >
                  <button className="kb-del" title="Excluir deal" onClick={() => deletar(deal.id, deal.nome)}>✕</button>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text1)', marginBottom: 2, paddingRight: 16 }}>{deal.nome}</div>
                  <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 8 }}>{deal.empresa || deal.clientes?.nome || '—'}</div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span className="num" style={{ fontSize: 12, fontWeight: 600, color: 'var(--green)' }}>{fmtBRL(deal.valor)}</span>
                    <span className="badge badge-gold">{deal.tag_label || deal.servico}</span>
                  </div>
                  {/* Fallback de toque (mobile): pontos das etapas */}
                  <div style={{ display: 'flex', gap: 5 }}>
                    {ETAPAS.map(e => (
                      <button
                        key={e.id}
                        title={`Mover para ${e.label}`}
                        onClick={() => e.id !== deal.etapa && mover(deal.id, e.id)}
                        style={{
                          width: 14, height: 14, borderRadius: 4, border: 'none', padding: 0,
                          background: e.id === deal.etapa ? e.cor : 'var(--bg4)',
                          opacity: e.id === deal.etapa ? 1 : 0.7,
                          cursor: e.id === deal.etapa ? 'default' : 'pointer',
                          transition: 'transform 0.12s ease, background 0.15s',
                        }}
                        onMouseEnter={ev => { if (e.id !== deal.etapa) ev.currentTarget.style.transform = 'scale(1.25)' }}
                        onMouseLeave={ev => ev.currentTarget.style.transform = 'scale(1)'}
                      />
                    ))}
                  </div>
                </div>
              ))}

              <button
                onClick={() => { setForm(f => ({ ...f, etapa: etapa.id })); setModal(true) }}
                style={{ width: '100%', border: '1px dashed var(--border2)', borderRadius: 7, padding: 7, fontSize: 11, color: 'var(--text3)', background: 'none', transition: 'border-color 0.15s, color 0.15s' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.color = 'var(--accent)' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border2)'; e.currentTarget.style.color = 'var(--text3)' }}
              >
                + Adicionar
              </button>
            </div>
          )
        })}
      </div>

      {/* Modal novo deal */}
      {modal && (
        <div className="modal-overlay" onMouseDown={e => { if (e.target === e.currentTarget) setModal(false) }}>
          <div className="modal">
            <div className="modal-title">Novo Deal</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
              <div style={{ gridColumn: '1/-1' }}>
                <label className="label">Nome do negócio *</label>
                <input className="input" value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} placeholder="Ex: Site para Clínica X" autoFocus />
              </div>
              <div>
                <label className="label">Empresa</label>
                <input className="input" value={form.empresa} onChange={e => setForm({ ...form, empresa: e.target.value })} placeholder="Nome da empresa" />
              </div>
              <div>
                <label className="label">Cliente (opcional)</label>
                <select className="input" value={form.cliente_id} onChange={e => setForm({ ...form, cliente_id: e.target.value })}>
                  <option value="">Selecione...</option>
                  {clientes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Serviço</label>
                <select className="input" value={form.servico} onChange={e => setForm({ ...form, servico: e.target.value })}>
                  {SERVICOS.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Etapa</label>
                <select className="input" value={form.etapa} onChange={e => setForm({ ...form, etapa: e.target.value })}>
                  {ETAPAS.map(e => <option key={e.id} value={e.id}>{e.label}</option>)}
                </select>
              </div>
              <div style={{ gridColumn: '1/-1' }}>
                <label className="label">Valor (R$)</label>
                <input className="input num" type="number" value={form.valor} onChange={e => setForm({ ...form, valor: e.target.value })} placeholder="0" />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button className="btn btn-ghost" onClick={() => setModal(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={!form.nome || saving}>
                {saving ? 'Salvando...' : 'Salvar deal'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
