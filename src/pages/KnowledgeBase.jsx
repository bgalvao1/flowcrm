import React, { useEffect, useState, useMemo } from 'react'
import { knowledgeAPI } from '../lib/supabase.js'
import { toast } from '../lib/toast.js'

const CATEGORIAS = ['Geral','Processos','Templates','Ferramentas','Clientes','Scripts de Venda','Onboarding','Financeiro']

export default function KnowledgeBase() {
  const [artigos, setArtigos] = useState([])
  const [loading, setLoading] = useState(true)
  const [busca, setBusca] = useState('')
  const [catFiltro, setCatFiltro] = useState('Todos')
  const [modal, setModal] = useState(false)
  const [editando, setEditando] = useState(null)
  const [form, setForm] = useState({ titulo: '', conteudo: '', categoria: 'Geral' })
  const [saving, setSaving] = useState(false)
  const [lendo, setLendo] = useState(null)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const { data } = await knowledgeAPI.listar()
    setArtigos(data || [])
    setLoading(false)
  }

  async function handleSave() {
    if (!form.titulo) return
    setSaving(true)
    const { error } = editando
      ? await knowledgeAPI.atualizar(editando.id, form)
      : await knowledgeAPI.criar(form)
    setSaving(false)
    if (error) { toast.error('Erro ao salvar'); return }
    toast.success(editando ? 'Artigo atualizado' : 'Artigo criado')
    setModal(false); setEditando(null); setForm({ titulo: '', conteudo: '', categoria: 'Geral' })
    await load()
  }

  async function deletar(id) {
    if (!confirm('Excluir este artigo?')) return
    await knowledgeAPI.deletar(id)
    toast.success('Artigo excluído')
    setLendo(null)
    await load()
  }

  function abrirEdicao(a) {
    setEditando(a); setForm({ titulo: a.titulo, conteudo: a.conteudo || '', categoria: a.categoria })
    setModal(true); setLendo(null)
  }

  const filtrados = useMemo(() => artigos.filter(a => {
    const match = !busca || a.titulo.toLowerCase().includes(busca.toLowerCase()) || (a.conteudo || '').toLowerCase().includes(busca.toLowerCase())
    const cat = catFiltro === 'Todos' || a.categoria === catFiltro
    return match && cat
  }), [artigos, busca, catFiltro])

  const cats = ['Todos', ...new Set(artigos.map(a => a.categoria).filter(Boolean))]

  return (
    <div>
      <div className="fade-up" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 className="page-title">Base de Conhecimento</h1>
          <div className="page-sub">Wiki interna da agência — SOPs, templates e processos</div>
        </div>
        <button className="btn btn-primary" onClick={() => { setEditando(null); setForm({ titulo: '', conteudo: '', categoria: 'Geral' }); setModal(true) }}>+ Novo Artigo</button>
      </div>

      {/* Busca e filtros */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 18, flexWrap: 'wrap' }}>
        <input className="input" style={{ flex: 1, minWidth: 220 }} placeholder="Buscar artigos..." value={busca} onChange={e => setBusca(e.target.value)} />
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {cats.map(c => (
            <button key={c} onClick={() => setCatFiltro(c)}
              className={catFiltro === c ? 'btn btn-primary' : 'btn btn-ghost'}
              style={{ fontSize: 11, padding: '5px 12px' }}>
              {c}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: lendo ? '280px 1fr' : 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
        {/* Lista de artigos */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {loading && [1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 80, borderRadius: 10 }} />)}
          {!loading && filtrados.length === 0 && (
            <div className="card" style={{ textAlign: 'center', padding: 32 }}>
              <div style={{ fontSize: 24, marginBottom: 8 }}>📚</div>
              <div style={{ fontSize: 12, color: 'var(--text3)' }}>Nenhum artigo encontrado</div>
            </div>
          )}
          {filtrados.map(a => (
            <div key={a.id} className={`card card-hover${lendo?.id === a.id ? '' : ''}`}
              style={{ cursor: 'pointer', borderLeft: lendo?.id === a.id ? '3px solid var(--accent)' : '3px solid transparent', transition: 'border-color 0.15s' }}
              onClick={() => setLendo(a)}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text1)', marginBottom: 4 }}>{a.titulo}</div>
                  <div style={{ fontSize: 11, color: 'var(--text3)' }}>
                    {(a.conteudo || '').slice(0, 80)}{a.conteudo?.length > 80 ? '...' : ''}
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8 }}>
                <span className="badge badge-gold" style={{ fontSize: 9 }}>{a.categoria}</span>
                <span style={{ fontSize: 10, color: 'var(--text3)' }}>{new Date(a.atualizado_em || a.criado_em).toLocaleDateString('pt-BR')}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Visualizador */}
        {lendo && (
          <div className="card fade-up" style={{ height: 'fit-content', position: 'sticky', top: 0 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
              <div>
                <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, color: 'var(--text1)', marginBottom: 4 }}>{lendo.titulo}</h2>
                <span className="badge badge-gold">{lendo.categoria}</span>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button className="btn btn-ghost" style={{ padding: '5px 10px', fontSize: 11 }} onClick={() => abrirEdicao(lendo)}>Editar</button>
                <button className="btn btn-danger" style={{ padding: '5px 10px', fontSize: 11 }} onClick={() => deletar(lendo.id)}>Excluir</button>
                <button onClick={() => setLendo(null)} style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', fontSize: 16 }}>✕</button>
              </div>
            </div>
            <div style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>{lendo.conteudo || 'Sem conteúdo.'}</div>
            <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 20, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
              Atualizado em {new Date(lendo.atualizado_em || lendo.criado_em).toLocaleDateString('pt-BR')}
            </div>
          </div>
        )}
      </div>

      {modal && (
        <div className="modal-overlay" onMouseDown={e => { if (e.target === e.currentTarget) { setModal(false); setEditando(null) } }}>
          <div className="modal" style={{ width: 'min(640px, calc(100vw - 32px))' }}>
            <div className="modal-title">{editando ? 'Editar Artigo' : 'Novo Artigo'}</div>
            <div style={{ marginBottom: 12 }}>
              <label className="label">Título *</label>
              <input className="input" value={form.titulo} onChange={e => setForm({...form, titulo: e.target.value})} placeholder="Ex: Como configurar Meta Ads para novos clientes" autoFocus />
            </div>
            <div style={{ marginBottom: 12 }}>
              <label className="label">Categoria</label>
              <select className="input" value={form.categoria} onChange={e => setForm({...form, categoria: e.target.value})}>
                {CATEGORIAS.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div style={{ marginBottom: 16 }}>
              <label className="label">Conteúdo</label>
              <textarea className="input" rows={10} style={{ resize: 'vertical', lineHeight: 1.7 }} value={form.conteudo} onChange={e => setForm({...form, conteudo: e.target.value})} placeholder="Escreva o conteúdo do artigo aqui..." />
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button className="btn btn-ghost" onClick={() => { setModal(false); setEditando(null) }}>Cancelar</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={!form.titulo || saving}>{saving ? 'Salvando...' : 'Salvar'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
