import React, { useEffect, useState, useRef } from 'react'
import { conteudoAPI, clientesAPI } from '../lib/supabase.js'
import { toast } from '../lib/toast.js'

const STATUS = [
  { id: 'ideia', label: 'Ideia', cor: '#8B9A8E' },
  { id: 'producao', label: 'Produção', cor: '#5FB7E8' },
  { id: 'revisao', label: 'Revisão', cor: '#EFB454' },
  { id: 'aprovado', label: 'Aprovado', cor: '#3DCE8C' },
  { id: 'publicado', label: 'Publicado', cor: '#E2C078' },
]
const TIPOS = ['post','story','reels','email','blog','carrossel']
const PLATAFORMAS = ['Instagram','Facebook','LinkedIn','TikTok','YouTube','Blog','E-mail']
const TIPO_EMOJI = { post: '🖼️', story: '📸', reels: '🎬', email: '📧', blog: '✍️', carrossel: '🗂️' }

export default function Conteudo() {
  const [itens, setItens] = useState([])
  const [clientes, setClientes] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [filtroCliente, setFiltroCliente] = useState('')
  const [form, setForm] = useState({ titulo: '', tipo: 'post', plataforma: 'Instagram', status: 'ideia', cliente_id: '', data_publicacao: '', descricao: '' })
  const [saving, setSaving] = useState(false)
  const [dragId, setDragId] = useState(null)
  const [overCol, setOverCol] = useState(null)
  const dragCounter = useRef({})

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const [{ data: i }, { data: c }] = await Promise.all([conteudoAPI.listar(), clientesAPI.listar()])
    setItens(i || [])
    setClientes(c || [])
    setLoading(false)
  }

  async function handleSave() {
    if (!form.titulo) return
    setSaving(true)
    const { error } = await conteudoAPI.criar(form)
    setSaving(false)
    if (error) { toast.error('Erro ao salvar'); return }
    toast.success('Conteúdo adicionado')
    setModal(false)
    setForm({ titulo: '', tipo: 'post', plataforma: 'Instagram', status: 'ideia', cliente_id: '', data_publicacao: '', descricao: '' })
    await load()
  }

  async function mover(id, status) {
    setItens(is => is.map(i => i.id === id ? { ...i, status } : i))
    const { error } = await conteudoAPI.moverStatus(id, status)
    if (error) toast.error('Erro ao mover')
    else toast.success(`Movido para ${STATUS.find(s => s.id === status)?.label}`)
  }

  async function deletar(id) {
    setItens(is => is.filter(i => i.id !== id))
    await conteudoAPI.deletar(id)
    toast.success('Conteúdo removido')
  }

  // Drag and drop
  function onDragStart(e, item) { setDragId(item.id); e.dataTransfer.setData('text/plain', item.id) }
  function onDragEnd() { setDragId(null); setOverCol(null); dragCounter.current = {} }
  function onDragEnter(sid) { dragCounter.current[sid] = (dragCounter.current[sid] || 0) + 1; setOverCol(sid) }
  function onDragLeave(sid) { dragCounter.current[sid] = (dragCounter.current[sid] || 1) - 1; if (dragCounter.current[sid] <= 0) setOverCol(c => c === sid ? null : c) }
  function onDrop(e, sid) {
    e.preventDefault()
    const id = e.dataTransfer.getData('text/plain') || dragId
    const item = itens.find(i => String(i.id) === String(id))
    setOverCol(null); setDragId(null); dragCounter.current = {}
    if (item && item.status !== sid) mover(item.id, sid)
  }

  const filtrados = filtroCliente ? itens.filter(i => i.cliente_id === filtroCliente) : itens

  return (
    <div>
      <div className="fade-up" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 className="page-title">Calendário Editorial</h1>
          <div className="page-sub">Kanban de conteúdo por cliente e plataforma</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <select className="input" style={{ minWidth: 160 }} value={filtroCliente} onChange={e => setFiltroCliente(e.target.value)}>
            <option value="">Todos os clientes</option>
            {clientes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </select>
          <button className="btn btn-primary" onClick={() => setModal(true)}>+ Novo Conteúdo</button>
        </div>
      </div>

      {/* Totais */}
      <div className="stagger" style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {STATUS.map(s => {
          const n = filtrados.filter(i => i.status === s.id).length
          return (
            <div key={s.id} className="card" style={{ padding: '8px 14px', flex: 1, borderTop: `2px solid ${s.cor}` }}>
              <div className="eyebrow" style={{ color: s.cor, marginBottom: 2 }}>{s.label}</div>
              <div className="num" style={{ fontSize: 18, fontWeight: 700 }}>{n}</div>
            </div>
          )
        })}
      </div>

      {/* Kanban */}
      <div style={{ display: 'flex', gap: 10, overflowX: 'auto', alignItems: 'flex-start', paddingBottom: 8 }}>
        {STATUS.map(st => {
          const cols = filtrados.filter(i => i.status === st.id)
          return (
            <div key={st.id} className={`kb-col${overCol === st.id ? ' drag-over' : ''}`}
              onDragOver={e => { e.preventDefault(); e.dataTransfer.dropEffect = 'move' }}
              onDragEnter={() => onDragEnter(st.id)}
              onDragLeave={() => onDragLeave(st.id)}
              onDrop={e => onDrop(e, st.id)}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: st.cor }}>
                  <span style={{ width: 7, height: 7, borderRadius: '50%', background: st.cor }} />{st.label}
                </div>
                <span className="num" style={{ fontSize: 10, background: 'var(--bg4)', borderRadius: 8, padding: '1px 7px', color: 'var(--text3)' }}>{cols.length}</span>
              </div>

              {loading && <div className="skeleton" style={{ height: 80, marginBottom: 8 }} />}

              {cols.map(item => (
                <div key={item.id} className={`kb-card${dragId === item.id ? ' dragging' : ''}`}
                  draggable onDragStart={e => onDragStart(e, item)} onDragEnd={onDragEnd}>
                  <button className="kb-del" onClick={() => deletar(item.id)}>✕</button>
                  <div style={{ fontSize: 14, marginBottom: 4 }}>{TIPO_EMOJI[item.tipo] || '📄'}</div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text1)', marginBottom: 4, paddingRight: 16 }}>{item.titulo}</div>
                  {item.clientes && <div style={{ fontSize: 10, color: 'var(--text3)', marginBottom: 6 }}>{item.clientes.nome}</div>}
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                    <span className="badge badge-sky" style={{ fontSize: 9 }}>{item.plataforma}</span>
                    <span className="badge badge-gold" style={{ fontSize: 9 }}>{item.tipo}</span>
                  </div>
                  {item.data_publicacao && (
                    <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 6 }}>
                      📅 {new Date(item.data_publicacao + 'T12:00:00').toLocaleDateString('pt-BR')}
                    </div>
                  )}
                </div>
              ))}

              <button onClick={() => { setForm(f => ({...f, status: st.id})); setModal(true) }}
                style={{ width: '100%', border: '1px dashed var(--border2)', borderRadius: 7, padding: 7, fontSize: 11, color: 'var(--text3)', background: 'none', transition: 'all 0.15s', cursor: 'pointer' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.color = 'var(--accent)' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border2)'; e.currentTarget.style.color = 'var(--text3)' }}>
                + Adicionar
              </button>
            </div>
          )
        })}
      </div>

      {modal && (
        <div className="modal-overlay" onMouseDown={e => { if (e.target === e.currentTarget) setModal(false) }}>
          <div className="modal">
            <div className="modal-title">Novo Conteúdo</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
              <div style={{ gridColumn: '1/-1' }}>
                <label className="label">Título *</label>
                <input className="input" value={form.titulo} onChange={e => setForm({...form, titulo: e.target.value})} placeholder="Ex: Post sobre resultados de julho" autoFocus />
              </div>
              <div>
                <label className="label">Cliente</label>
                <select className="input" value={form.cliente_id} onChange={e => setForm({...form, cliente_id: e.target.value})}>
                  <option value="">—</option>
                  {clientes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Tipo</label>
                <select className="input" value={form.tipo} onChange={e => setForm({...form, tipo: e.target.value})}>
                  {TIPOS.map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Plataforma</label>
                <select className="input" value={form.plataforma} onChange={e => setForm({...form, plataforma: e.target.value})}>
                  {PLATAFORMAS.map(p => <option key={p}>{p}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Data de publicação</label>
                <input className="input" type="date" value={form.data_publicacao} onChange={e => setForm({...form, data_publicacao: e.target.value})} />
              </div>
              <div style={{ gridColumn: '1/-1' }}>
                <label className="label">Descrição / pauta</label>
                <textarea className="input" rows={3} value={form.descricao} onChange={e => setForm({...form, descricao: e.target.value})} placeholder="Breve descrição do conteúdo..." />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button className="btn btn-ghost" onClick={() => setModal(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={!form.titulo || saving}>{saving ? 'Salvando...' : 'Criar'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
