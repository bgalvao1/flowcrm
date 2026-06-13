import React, { useEffect, useState } from 'react'
import { onboardingAPI, clientesAPI } from '../lib/supabase.js'
import { toast } from '../lib/toast.js'

const STEPS_PADRAO = [
  { titulo: 'Acesso às contas de anúncio', responsavel: 'cliente' },
  { titulo: 'Preenchimento do briefing', responsavel: 'cliente' },
  { titulo: 'Reunião de kick-off agendada', responsavel: 'agencia' },
  { titulo: 'Criação do grupo de WhatsApp', responsavel: 'agencia' },
  { titulo: 'Acesso ao Google Analytics / GSC', responsavel: 'cliente' },
  { titulo: 'Definição de metas e KPIs', responsavel: 'agencia' },
  { titulo: 'Configuração do pixel / tag', responsavel: 'agencia' },
  { titulo: 'Aprovação do planejamento inicial', responsavel: 'cliente' },
]

export default function Onboarding() {
  const [boards, setBoards] = useState([])
  const [clientes, setClientes] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({ cliente_id: '', titulo: 'Onboarding' })
  const [aberto, setAberto] = useState(null)
  const [novoStep, setNovoStep] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const [{ data: b }, { data: c }] = await Promise.all([onboardingAPI.listar(), clientesAPI.listar()])
    setBoards(b || [])
    setClientes(c || [])
    setLoading(false)
  }

  async function criar() {
    if (!form.cliente_id) return
    setSaving(true)
    const { data: board, error } = await onboardingAPI.criar(form.cliente_id, form.titulo)
    if (error) { toast.error('Erro ao criar onboarding'); setSaving(false); return }
    // Adiciona steps padrão
    for (const [i, s] of STEPS_PADRAO.entries()) {
      await onboardingAPI.addStep(board.id, { ...s, ordem: i })
    }
    toast.success('Onboarding criado com steps padrão')
    setModal(false)
    setForm({ cliente_id: '', titulo: 'Onboarding' })
    setSaving(false)
    await load()
  }

  async function toggleStep(boardId, stepId, atual) {
    await onboardingAPI.toggleStep(stepId, !atual)
    setBoards(bs => bs.map(b => b.id === boardId
      ? { ...b, onboarding_steps: b.onboarding_steps.map(s => s.id === stepId ? { ...s, concluido: !atual } : s) }
      : b
    ))
  }

  async function addStep(boardId) {
    if (!novoStep.trim()) return
    const { data } = await onboardingAPI.addStep(boardId, { titulo: novoStep, responsavel: 'agencia', ordem: 99 })
    setBoards(bs => bs.map(b => b.id === boardId ? { ...b, onboarding_steps: [...b.onboarding_steps, data] } : b))
    setNovoStep('')
    toast.success('Passo adicionado')
  }

  function progresso(board) {
    const steps = board.onboarding_steps || []
    if (!steps.length) return 0
    return Math.round(steps.filter(s => s.concluido).length / steps.length * 100)
  }

  return (
    <div>
      <div className="fade-up" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 className="page-title">Onboarding de Clientes</h1>
          <div className="page-sub">Checklists de boas-vindas por cliente</div>
        </div>
        <button className="btn btn-primary" onClick={() => setModal(true)}>+ Novo Onboarding</button>
      </div>

      {loading && <div className="skeleton" style={{ height: 120, borderRadius: 10 }} />}

      <div className="stagger" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 14 }}>
        {boards.map(b => {
          const pct = progresso(b)
          const steps = [...(b.onboarding_steps || [])].sort((a, x) => a.ordem - x.ordem)
          const isAberto = aberto === b.id
          return (
            <div key={b.id} className="card">
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: b.clientes?.cor || 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
                  {b.clientes?.iniciais || '??'}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text1)' }}>{b.clientes?.nome || '—'}</div>
                  <div style={{ fontSize: 11, color: 'var(--text3)' }}>{b.titulo}</div>
                </div>
                <span className={`badge ${pct === 100 ? 'badge-green' : pct > 50 ? 'badge-gold' : 'badge-sky'}`}>{pct}%</span>
              </div>

              {/* Barra de progresso */}
              <div style={{ height: 4, background: 'var(--bg4)', borderRadius: 2, marginBottom: 12, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${pct}%`, background: pct === 100 ? 'var(--green)' : 'var(--grad-brand)', borderRadius: 2, transition: 'width 0.4s ease' }} />
              </div>

              {/* Steps */}
              <div style={{ maxHeight: isAberto ? 999 : 180, overflow: 'hidden', transition: 'max-height 0.3s ease' }}>
                {steps.map(s => (
                  <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
                    <button onClick={() => toggleStep(b.id, s.id, s.concluido)}
                      style={{ width: 18, height: 18, borderRadius: 5, border: `1.5px solid ${s.concluido ? 'var(--green)' : 'var(--border2)'}`, background: s.concluido ? 'var(--green)' : 'transparent', flexShrink: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s' }}>
                      {s.concluido && <svg width="10" height="10" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="#fff" strokeWidth="1.5" strokeLinecap="round"/></svg>}
                    </button>
                    <span style={{ flex: 1, fontSize: 12, color: s.concluido ? 'var(--text3)' : 'var(--text1)', textDecoration: s.concluido ? 'line-through' : 'none' }}>{s.titulo}</span>
                    <span className={`badge ${s.responsavel === 'cliente' ? 'badge-amber' : 'badge-sky'}`} style={{ fontSize: 9 }}>{s.responsavel === 'cliente' ? 'Cliente' : 'Agência'}</span>
                  </div>
                ))}

                {/* Adicionar step */}
                {isAberto && (
                  <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
                    <input className="input" style={{ flex: 1 }} placeholder="Novo passo..." value={novoStep} onChange={e => setNovoStep(e.target.value)} onKeyDown={e => e.key === 'Enter' && addStep(b.id)} />
                    <button className="btn btn-primary" style={{ padding: '6px 12px' }} onClick={() => addStep(b.id)}>+</button>
                  </div>
                )}
              </div>

              <button onClick={() => setAberto(isAberto ? null : b.id)}
                style={{ width: '100%', background: 'none', border: 'none', color: 'var(--text3)', fontSize: 11, marginTop: 8, cursor: 'pointer', padding: '4px 0' }}>
                {isAberto ? '▲ Recolher' : `▼ Ver todos os ${steps.length} passos`}
              </button>
            </div>
          )
        })}
      </div>

      {!loading && boards.length === 0 && (
        <div className="card" style={{ textAlign: 'center', padding: 40 }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>🚀</div>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text1)', marginBottom: 4 }}>Nenhum onboarding ainda</div>
          <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 16 }}>Crie um checklist de boas-vindas para cada cliente novo</div>
          <button className="btn btn-primary" onClick={() => setModal(true)}>Criar primeiro onboarding</button>
        </div>
      )}

      {modal && (
        <div className="modal-overlay" onMouseDown={e => { if (e.target === e.currentTarget) setModal(false) }}>
          <div className="modal">
            <div className="modal-title">Novo Onboarding</div>
            <div style={{ marginBottom: 12 }}>
              <label className="label">Cliente *</label>
              <select className="input" value={form.cliente_id} onChange={e => setForm({ ...form, cliente_id: e.target.value })} autoFocus>
                <option value="">Selecione...</option>
                {clientes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
            </div>
            <div style={{ marginBottom: 16 }}>
              <label className="label">Título</label>
              <input className="input" value={form.titulo} onChange={e => setForm({ ...form, titulo: e.target.value })} />
            </div>
            <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 16, background: 'var(--bg3)', borderRadius: 7, padding: '8px 12px' }}>
              {STEPS_PADRAO.length} passos padrão serão adicionados automaticamente
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button className="btn btn-ghost" onClick={() => setModal(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={criar} disabled={!form.cliente_id || saving}>{saving ? 'Criando...' : 'Criar Onboarding'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
