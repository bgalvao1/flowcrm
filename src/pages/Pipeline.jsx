import React, { useEffect, useRef, useState } from 'react'
import { pipelineAPI, clientesAPI } from '../lib/supabase.js'
import { toast } from '../lib/toast.js'
import { useCompact } from '../components/Layout.jsx'

const ETAPAS = [
  { id: 'prospeccao', label: 'Prospecção', cor: '#8B9A8E' },
  { id: 'qualificacao', label: 'Qualificação', cor: '#5FB7E8' },
  { id: 'proposta', label: 'Proposta', cor: '#EFB454' },
  { id: 'fechado', label: 'Fechado', cor: '#3DCE8C' },
  { id: 'perdido', label: 'Perdido', cor: '#E8645B' },
]
const SERVICOS = ['Todos', 'Tráfego Pago', 'Site', 'Landing Page', 'Agente IA', 'App Mobile', 'SaaS', 'Consultoria', 'Redes Sociais']

const fmtBRL = (v) => `R$ ${Number(v || 0).toLocaleString('pt-BR')}`

// Confete simples ao fechar deal
function launchConfetti() {
  const colors = ['#E2C078', '#D98E4A', '#3DCE8C', '#5FB7E8', '#EFB454']
  for (let i = 0; i < 60; i++) {
    const el = document.createElement('div')
    el.style.cssText = `
      position:fixed; top:${Math.random() * 40}vh; left:${Math.random() * 100}vw;
      width:8px; height:8px; border-radius:${Math.random() > 0.5 ? '50%' : '2px'};
      background:${colors[Math.floor(Math.random() * colors.length)]};
      pointer-events:none; z-index:9999;
      animation: confetti-fall 1.2s ease-out forwards;
      animation-delay: ${Math.random() * 0.4}s;
    `
    document.body.appendChild(el)
    setTimeout(() => el.remove(), 1800)
  }
}

// Injeta keyframe só uma vez
if (!document.getElementById('confetti-style')) {
  const s = document.createElement('style')
  s.id = 'confetti-style'
  s.textContent = `@keyframes confetti-fall {
    from { transform: translateY(0) rotate(0deg); opacity: 1; }
    to   { transform: translateY(60vh) rotate(720deg); opacity: 0; }
  }`
  document.head.appendChild(s)
}

export default function Pipeline() {
  const compact = useCompact()
  const [deals, setDeals] = useState([])
  const [clientes, setClientes] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({ nome: '', empresa: '', cliente_id: '', servico: 'Tráfego Pago', etapa: 'prospeccao', valor: '0' })
  const [saving, setSaving] = useState(false)
  const [dragId, setDragId] = useState(null)
  const [overCol, setOverCol] = useState(null)
  const dragCounter = useRef({})

  // Filtros
  const [filtroServico, setFiltroServico] = useState('Todos')
  const [filtroValorMin, setFiltroValorMin] = useState('')
  const [filtroValorMax, setFiltroValorMax] = useState('')
  const [filtrosAbertos, setFiltrosAbertos] = useState(false)

  // Edição inline
  const [editando, setEditando] = useState(null) // { id, campo }
  const [editVal, setEditVal] = useState('')

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

  async function mover(id, etapa) {
    const anterior = deals
    const alvo = ETAPAS.find(e => e.id === etapa)
    setDeals(ds => ds.map(d => d.id === id ? { ...d, etapa } : d))
    const { error } = await pipelineAPI.moverEtapa(id, etapa)
    if (error) {
      setDeals(anterior)
      toast.error('Não foi possível mover')
    } else {
      if (etapa === 'fechado') { launchConfetti(); toast.success('🎉 Deal fechado!') }
      else toast.success(`Movido para ${alvo?.label}`)
    }
  }

  async function deletar(id, nome) {
    if (!window.confirm(`Excluir "${nome}"?`)) return
    const anterior = deals
    setDeals(ds => ds.filter(d => d.id !== id))
    const { error } = await pipelineAPI.deletar(id)
    if (error) { setDeals(anterior); toast.error('Erro ao excluir') }
    else toast.success('Deal excluído')
  }

  // ── Edição inline ────────────────────────────────────
  function iniciarEdicao(deal, campo) {
    setEditando({ id: deal.id, campo })
    setEditVal(campo === 'valor' ? String(deal.valor) : deal[campo] || '')
  }

  async function salvarEdicao(deal) {
    if (!editando) return
    const { campo } = editando
    const novoValor = campo === 'valor' ? parseFloat(editVal) || 0 : editVal
    if (String(novoValor) === String(deal[campo])) { setEditando(null); return }
    const anterior = deals
    setDeals(ds => ds.map(d => d.id === deal.id ? { ...d, [campo]: novoValor } : d))
    setEditando(null)
    const { error } = await pipelineAPI.atualizar?.(deal.id, { [campo]: novoValor, tag_label: campo === 'servico' ? novoValor : deal.tag_label })
      ?? { error: null }
    if (error) { setDeals(anterior); toast.error('Erro ao editar') }
    else toast.success('Deal atualizado')
  }

  // ── Drag and drop ──────────────────────────────────────
  function onDragStart(e, deal) { setDragId(deal.id); e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', deal.id) }
  function onDragEnd() { setDragId(null); setOverCol(null); dragCounter.current = {} }
  function onDragEnter(etapaId) { dragCounter.current[etapaId] = (dragCounter.current[etapaId] || 0) + 1; setOverCol(etapaId) }
  function onDragLeave(etapaId) { dragCounter.current[etapaId] = (dragCounter.current[etapaId] || 1) - 1; if (dragCounter.current[etapaId] <= 0) setOverCol(c => (c === etapaId ? null : c)) }
  function onDrop(e, etapaId) {
    e.preventDefault()
    const id = e.dataTransfer.getData('text/plain') || dragId
    const deal = deals.find(d => String(d.id) === String(id))
    setOverCol(null); setDragId(null); dragCounter.current = {}
    if (deal && deal.etapa !== etapaId) mover(deal.id, etapaId)
  }

  // ── Filtros ───────────────────────────────────────────
  const dealsFiltrados = deals.filter(d => {
    if (filtroServico !== 'Todos' && d.tag_label !== filtroServico && d.servico !== filtroServico) return false
    if (filtroValorMin && Number(d.valor) < Number(filtroValorMin)) return false
    if (filtroValorMax && Number(d.valor) > Number(filtroValorMax)) return false
    return true
  })
  const temFiltro = filtroServico !== 'Todos' || filtroValorMin || filtroValorMax

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }} className="fade-up">
        <div>
          <h1 className="page-title">Pipeline de Vendas</h1>
          <div className="page-sub">Arraste os cards · clique para editar inline</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            className={`btn btn-ghost`}
            onClick={() => setFiltrosAbertos(f => !f)}
            style={{ position: 'relative' }}
          >
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none"><path d="M2 4h12M5 8h6M7 12h2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
            Filtros
            {temFiltro && <span style={{ position: 'absolute', top: 4, right: 4, width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)' }} />}
          </button>
          <button className="btn btn-primary" onClick={() => setModal(true)}>+ Novo Deal</button>
        </div>
      </div>

      {/* Painel de filtros */}
      {filtrosAbertos && (
        <div className="card fade-up" style={{ marginBottom: 14, padding: '12px 16px', display: 'flex', gap: 16, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div>
            <label className="label">Serviço</label>
            <select className="input" style={{ minWidth: 160 }} value={filtroServico} onChange={e => setFiltroServico(e.target.value)}>
              {SERVICOS.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Valor mínimo</label>
            <input className="input num" style={{ width: 130 }} type="number" placeholder="R$ 0" value={filtroValorMin} onChange={e => setFiltroValorMin(e.target.value)} />
          </div>
          <div>
            <label className="label">Valor máximo</label>
            <input className="input num" style={{ width: 130 }} type="number" placeholder="R$ ∞" value={filtroValorMax} onChange={e => setFiltroValorMax(e.target.value)} />
          </div>
          {temFiltro && (
            <button className="btn btn-ghost" onClick={() => { setFiltroServico('Todos'); setFiltroValorMin(''); setFiltroValorMax('') }}>
              Limpar filtros
            </button>
          )}
          <div style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--text3)' }}>
            {dealsFiltrados.length} de {deals.length} deals
          </div>
        </div>
      )}

      {/* Totalizadores */}
      <div className="stagger" style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {ETAPAS.map(e => {
          const etapaDeals = dealsFiltrados.filter(d => d.etapa === e.id)
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
          const etapaDeals = dealsFiltrados.filter(d => d.etapa === etapa.id)
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
                  style={compact ? { padding: '7px 10px', marginBottom: 5 } : {}}
                >
                  <button className="kb-del" title="Excluir" onClick={() => deletar(deal.id, deal.nome)}>✕</button>

                  {/* Nome — edição inline ao clicar */}
                  {editando?.id === deal.id && editando.campo === 'nome' ? (
                    <input
                      autoFocus
                      className="input"
                      style={{ fontSize: 12, fontWeight: 600, marginBottom: 4, padding: '3px 6px' }}
                      value={editVal}
                      onChange={e => setEditVal(e.target.value)}
                      onBlur={() => salvarEdicao(deal)}
                      onKeyDown={e => { if (e.key === 'Enter') salvarEdicao(deal); if (e.key === 'Escape') setEditando(null) }}
                    />
                  ) : (
                    <div
                      title="Clique para editar"
                      style={{ fontSize: 12, fontWeight: 600, color: 'var(--text1)', marginBottom: 2, paddingRight: 16, cursor: 'text' }}
                      onClick={() => iniciarEdicao(deal, 'nome')}
                    >{deal.nome}</div>
                  )}

                  <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 6 }}>{deal.empresa || deal.clientes?.nome || '—'}</div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    {/* Valor — edição inline */}
                    {editando?.id === deal.id && editando.campo === 'valor' ? (
                      <input
                        autoFocus
                        className="input num"
                        type="number"
                        style={{ fontSize: 12, fontWeight: 600, width: 100, padding: '3px 6px', color: 'var(--green)' }}
                        value={editVal}
                        onChange={e => setEditVal(e.target.value)}
                        onBlur={() => salvarEdicao(deal)}
                        onKeyDown={e => { if (e.key === 'Enter') salvarEdicao(deal); if (e.key === 'Escape') setEditando(null) }}
                      />
                    ) : (
                      <span
                        title="Clique para editar valor"
                        className="num"
                        style={{ fontSize: 12, fontWeight: 600, color: 'var(--green)', cursor: 'text' }}
                        onClick={() => iniciarEdicao(deal, 'valor')}
                      >{fmtBRL(deal.valor)}</span>
                    )}
                    <span className="badge badge-gold">{deal.tag_label || deal.servico}</span>
                  </div>

                  {/* Dots de etapa */}
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
                  {SERVICOS.filter(s => s !== 'Todos').map(s => <option key={s}>{s}</option>)}
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
