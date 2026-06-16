import React, { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase.js'

// ── Paleta Flow ───────────────────────────────────────────
const C = {
  bg0: '#0A0D0B', bg1: '#0E1310', bg2: '#131A15', bg3: '#1A231C',
  bg4: '#232E26', border: '#1E2821', border2: '#2B382F',
  text1: '#EEF3EE', text2: '#9CAC9F', text3: '#5D6C60',
  accent: '#E2C078', accent2: '#D98E4A', onAccent: '#181208',
  green: '#3DCE8C', amber: '#EFB454', red: '#E8645B', sky: '#5FB7E8',
  grad: 'linear-gradient(135deg, #E2C078, #D98E4A)',
}

const S = {
  inp: { width: '100%', background: C.bg3, border: `1px solid ${C.border2}`, borderRadius: 7, padding: '8px 12px', color: C.text1, fontSize: 12, outline: 'none', fontFamily: 'DM Sans, sans-serif', boxSizing: 'border-box' },
  lbl: { fontSize: 10, color: C.text3, display: 'block', marginBottom: 4, letterSpacing: '0.8px', textTransform: 'uppercase', fontWeight: 600 },
  card: { background: C.bg2, border: `1px solid ${C.border}`, borderRadius: 10, padding: 16 },
  btn: { background: C.grad, border: 'none', borderRadius: 7, padding: '8px 16px', fontSize: 12, fontWeight: 700, color: C.onAccent, cursor: 'pointer' },
  btnGhost: { background: 'none', border: `1px solid ${C.border2}`, borderRadius: 7, padding: '7px 14px', fontSize: 12, color: C.text2, cursor: 'pointer' },
}

const ETAPAS = [
  { id: 'prospeccao', label: 'Prospecção', cor: '#8B9A8E' },
  { id: 'contato', label: '1º Contato', cor: '#5FB7E8' },
  { id: 'qualificacao', label: 'Qualificação', cor: '#9B7FE8' },
  { id: 'proposta', label: 'Proposta', cor: '#EFB454' },
  { id: 'negociacao', label: 'Negociação', cor: '#E2C078' },
  { id: 'fechado', label: 'Fechado', cor: '#3DCE8C' },
  { id: 'perdido', label: 'Perdido', cor: '#E8645B' },
]

const TEMP_COR = { frio: C.sky, morno: C.amber, quente: C.red }
const TEMP_LABEL = { frio: '🧊 Frio', morno: '🌡️ Morno', quente: '🔥 Quente' }
const PRIOR_COR = { baixa: C.text3, normal: C.sky, alta: C.red }

// ── Tela de BLOQUEIO ─────────────────────────────────────
function TelaBloqueada({ empresa, onLogout }) {
  const [copiado, setCopiado] = useState(false)
  const pix = 'bgalvao1@gmail.com'

  function copiar() {
    navigator.clipboard.writeText(pix)
    setCopiado(true)
    setTimeout(() => setCopiado(false), 2000)
  }

  return (
    <div style={{ minHeight: '100vh', background: C.bg0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'DM Sans, sans-serif', padding: 16 }}>
      <div style={{ ...S.card, maxWidth: 440, width: '100%', textAlign: 'center', padding: 36 }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🔒</div>
        <div style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: 22, fontWeight: 700, color: C.text1, marginBottom: 8 }}>Acesso suspenso</div>
        <div style={{ fontSize: 13, color: C.text2, marginBottom: 28, lineHeight: 1.6 }}>
          O período do seu plano encerrou. Renove para continuar acessando o CRM. Seus dados estão seguros e não serão perdidos.
        </div>

        <div style={{ background: C.bg3, border: `1px solid ${C.border2}`, borderRadius: 12, padding: 20, marginBottom: 20 }}>
          <div style={{ fontSize: 11, color: C.text3, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Planos disponíveis</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
            {[['1 mês', 'R$ 69,90'], ['3 meses', 'R$ 97,00']].map(([p, v]) => (
              <div key={p} style={{ background: C.bg4, borderRadius: 8, padding: '10px 0', border: `1px solid ${C.border2}` }}>
                <div style={{ fontSize: 11, color: C.text3, marginBottom: 2 }}>{p}</div>
                <div style={{ fontSize: 18, fontWeight: 800, color: C.accent, fontFamily: 'Space Grotesk, sans-serif' }}>{v}</div>
              </div>
            ))}
          </div>
          <div style={{ fontSize: 12, color: C.text2, marginBottom: 10 }}>Pague via PIX e envie o comprovante para a Flow Agency</div>
          <div style={{ background: C.bg0, border: `1px solid ${C.border2}`, borderRadius: 7, padding: '10px 14px', fontSize: 13, color: C.accent, fontWeight: 600, marginBottom: 10 }}>
            {pix}
          </div>
          <button onClick={copiar} style={{ ...S.btn, width: '100%' }}>
            {copiado ? '✓ Copiado!' : '📋 Copiar chave PIX'}
          </button>
        </div>

        <div style={{ fontSize: 11, color: C.text3, marginBottom: 16 }}>
          Após o pagamento, entre em contato com a Flow Agency para liberar o acesso.
        </div>
        <button onClick={onLogout} style={{ ...S.btnGhost, fontSize: 11 }}>Sair</button>
      </div>
    </div>
  )
}

// ── Login ─────────────────────────────────────────────────
function Login({ onLogin }) {
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogin(e) {
    e.preventDefault(); setErro(''); setLoading(true)
    const { data, error } = await supabase.from('crm_empresas').select('*').ilike('email', email.trim().toLowerCase()).single()
    setLoading(false)
    if (error || !data) { setErro('E-mail não encontrado.'); return }
    if (data.senha !== senha) { setErro('Senha incorreta.'); return }
    onLogin(data)
  }

  return (
    <div style={{ minHeight: '100vh', background: C.bg0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'DM Sans, sans-serif', padding: 16 }}>
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: '20%', left: '50%', transform: 'translateX(-50%)', width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle, rgba(226,192,120,0.05) 0%, transparent 70%)' }} />
      </div>
      <div style={{ ...S.card, width: '100%', maxWidth: 340, position: 'relative', zIndex: 1, boxShadow: '0 24px 64px rgba(0,0,0,0.5)', padding: '36px 28px' }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em' }}>
            Flow<span style={{ color: C.accent }}>CRM</span>
          </div>
          <div style={{ fontSize: 11, color: C.text3, letterSpacing: '1px', textTransform: 'uppercase', marginTop: 3 }}>Acesso empresarial</div>
        </div>
        <form onSubmit={handleLogin}>
          <div style={{ marginBottom: 12 }}>
            <label style={S.lbl}>E-mail</label>
            <input value={email} onChange={e => setEmail(e.target.value)} type="email" required placeholder="empresa@email.com" style={S.inp} autoFocus />
          </div>
          <div style={{ marginBottom: 20 }}>
            <label style={S.lbl}>Senha</label>
            <input value={senha} onChange={e => setSenha(e.target.value)} type="password" required placeholder="••••••••" style={S.inp} />
          </div>
          {erro && <div style={{ fontSize: 11, color: C.red, marginBottom: 14, background: 'rgba(232,100,91,0.08)', border: '1px solid rgba(232,100,91,0.2)', borderRadius: 6, padding: '8px 12px' }}>{erro}</div>}
          <button type="submit" disabled={loading} style={{ ...S.btn, width: '100%', padding: 11, fontSize: 13 }}>
            {loading ? 'Entrando...' : 'Acessar'}
          </button>
        </form>
      </div>
    </div>
  )
}

// ── Pipeline ──────────────────────────────────────────────
function Pipeline({ empresaId }) {
  const [leads, setLeads] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [editando, setEditando] = useState(null)
  const [form, setForm] = useState({ nome: '', empresa: '', whatsapp: '', email: '', cargo: '', servico: '', valor: '', etapa: 'prospeccao', temperatura: 'morno', proximo_followup: '', observacao: '' })
  const [dragId, setDragId] = useState(null)
  const [overCol, setOverCol] = useState(null)

  useEffect(() => { load() }, [empresaId])

  async function load() {
    setLoading(true)
    const { data } = await supabase.from('crm_leads').select('*').eq('empresa_id', empresaId).order('criado_em', { ascending: false })
    setLeads(data || [])
    setLoading(false)
  }

  async function salvar() {
    const dados = { ...form, empresa_id: empresaId, valor: parseFloat(form.valor) || 0, atualizado_em: new Date().toISOString() }
    if (editando) await supabase.from('crm_leads').update(dados).eq('id', editando.id)
    else await supabase.from('crm_leads').insert(dados)
    setModal(false); setEditando(null)
    setForm({ nome: '', empresa: '', whatsapp: '', email: '', cargo: '', servico: '', valor: '', etapa: 'prospeccao', temperatura: 'morno', proximo_followup: '', observacao: '' })
    await load()
  }

  async function mover(id, etapa) {
    setLeads(ls => ls.map(l => l.id === id ? { ...l, etapa } : l))
    await supabase.from('crm_leads').update({ etapa, atualizado_em: new Date().toISOString() }).eq('id', id)
  }

  async function deletar(id) {
    if (!confirm('Excluir este lead?')) return
    setLeads(ls => ls.filter(l => l.id !== id))
    await supabase.from('crm_leads').delete().eq('id', id)
  }

  function abrir(lead = null) {
    if (lead) { setEditando(lead); setForm({ ...lead, valor: String(lead.valor || '') }) }
    else { setEditando(null); setForm({ nome: '', empresa: '', whatsapp: '', email: '', cargo: '', servico: '', valor: '', etapa: 'prospeccao', temperatura: 'morno', proximo_followup: '', observacao: '' }) }
    setModal(true)
  }

  function onDragStart(e, id) { setDragId(id); e.dataTransfer.setData('text/plain', id) }
  function onDragEnd() { setDragId(null); setOverCol(null) }
  function onDrop(e, etapa) {
    e.preventDefault()
    const id = e.dataTransfer.getData('text/plain') || dragId
    const lead = leads.find(l => String(l.id) === String(id))
    setOverCol(null); setDragId(null)
    if (lead && lead.etapa !== etapa) mover(lead.id, etapa)
  }

  const hoje = new Date().toISOString().split('T')[0]
  const vencidos = leads.filter(l => l.proximo_followup && l.proximo_followup < hoje && !['fechado','perdido'].includes(l.etapa)).length

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <div style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: 18, fontWeight: 700, color: C.text1 }}>Pipeline de Prospecção</div>
          {vencidos > 0 && <div style={{ fontSize: 11, color: C.red, marginTop: 2 }}>⚠️ {vencidos} follow-up{vencidos > 1 ? 's' : ''} em atraso</div>}
        </div>
        <button style={S.btn} onClick={() => abrir()}>+ Novo Lead</button>
      </div>

      {/* Totais */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 14, overflowX: 'auto', paddingBottom: 4 }}>
        {ETAPAS.map(e => {
          const n = leads.filter(l => l.etapa === e.id).length
          const v = leads.filter(l => l.etapa === e.id).reduce((a, l) => a + Number(l.valor || 0), 0)
          return (
            <div key={e.id} style={{ background: C.bg2, border: `1px solid ${C.border}`, borderRadius: 8, padding: '8px 12px', borderTop: `2px solid ${e.cor}`, flexShrink: 0, minWidth: 100 }}>
              <div style={{ fontSize: 9, color: e.cor, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 2 }}>{e.label}</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: C.text1, fontFamily: 'Space Grotesk, sans-serif' }}>{n}</div>
              {v > 0 && <div style={{ fontSize: 9, color: C.text3, fontFamily: 'monospace' }}>R$ {v.toLocaleString('pt-BR')}</div>}
            </div>
          )
        })}
      </div>

      {/* Kanban */}
      <div style={{ display: 'flex', gap: 8, overflowX: 'auto', alignItems: 'flex-start', paddingBottom: 8 }}>
        {ETAPAS.map(etapa => {
          const col = leads.filter(l => l.etapa === etapa.id)
          return (
            <div key={etapa.id}
              style={{ minWidth: 200, background: overCol === etapa.id ? `${etapa.cor}10` : C.bg2, border: `1px solid ${overCol === etapa.id ? etapa.cor : C.border}`, borderRadius: 10, padding: 10, flexShrink: 0, transition: 'all 0.15s' }}
              onDragOver={e => { e.preventDefault(); setOverCol(etapa.id) }}
              onDragLeave={() => setOverCol(null)}
              onDrop={e => onDrop(e, etapa.id)}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 700, color: etapa.cor }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: etapa.cor }} />{etapa.label}
                </div>
                <span style={{ fontSize: 10, background: C.bg4, borderRadius: 8, padding: '1px 6px', color: C.text3 }}>{col.length}</span>
              </div>

              {loading && <div style={{ height: 60, background: C.bg3, borderRadius: 7, marginBottom: 6 }} />}

              {col.map(lead => {
                const atrasado = lead.proximo_followup && lead.proximo_followup < hoje
                return (
                  <div key={lead.id}
                    draggable onDragStart={e => onDragStart(e, lead.id)} onDragEnd={onDragEnd}
                    onClick={() => abrir(lead)}
                    style={{ background: C.bg3, border: `1px solid ${atrasado ? C.red : C.border2}`, borderRadius: 8, padding: 10, marginBottom: 7, cursor: 'pointer', transition: 'transform 0.1s', opacity: dragId === lead.id ? 0.4 : 1 }}
                    onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                    onMouseLeave={e => e.currentTarget.style.transform = 'none'}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 3 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: C.text1, flex: 1 }}>{lead.nome}</div>
                      <span style={{ fontSize: 9, padding: '2px 5px', borderRadius: 4, background: `${TEMP_COR[lead.temperatura]}18`, color: TEMP_COR[lead.temperatura], fontWeight: 700, flexShrink: 0 }}>{lead.temperatura?.toUpperCase()}</span>
                    </div>
                    {lead.empresa && <div style={{ fontSize: 10, color: C.text3, marginBottom: 4 }}>{lead.empresa}</div>}
                    {lead.cargo && <div style={{ fontSize: 10, color: C.text3, marginBottom: 4 }}>👤 {lead.cargo}</div>}
                    {lead.valor > 0 && <div style={{ fontSize: 11, fontWeight: 700, color: C.green, fontFamily: 'monospace', marginBottom: 4 }}>R$ {Number(lead.valor).toLocaleString('pt-BR')}</div>}
                    {lead.proximo_followup && (
                      <div style={{ fontSize: 10, color: atrasado ? C.red : C.text3, fontWeight: atrasado ? 700 : 400 }}>
                        {atrasado ? '⚠️' : '📅'} Follow-up: {new Date(lead.proximo_followup + 'T12:00:00').toLocaleDateString('pt-BR')}
                      </div>
                    )}
                    {lead.whatsapp && (
                      <a href={`https://wa.me/55${lead.whatsapp.replace(/\D/g,'')}`} target="_blank" rel="noreferrer"
                        onClick={e => e.stopPropagation()}
                        style={{ display: 'block', fontSize: 10, color: C.green, textDecoration: 'none', marginTop: 4 }}>
                        💬 {lead.whatsapp}
                      </a>
                    )}
                    <button onClick={e => { e.stopPropagation(); deletar(lead.id) }}
                      style={{ position: 'absolute', top: 6, right: 6, background: 'none', border: 'none', color: C.text3, cursor: 'pointer', fontSize: 11, opacity: 0 }}
                      onMouseOver={e => e.currentTarget.style.opacity = 1}
                      onMouseOut={e => e.currentTarget.style.opacity = 0}>✕</button>
                  </div>
                )
              })}

              <button onClick={() => { setForm(f => ({...f, etapa: etapa.id})); setModal(true) }}
                style={{ width: '100%', border: `1px dashed ${C.border2}`, borderRadius: 6, padding: 6, fontSize: 10, color: C.text3, background: 'none', cursor: 'pointer' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = C.accent; e.currentTarget.style.color = C.accent }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = C.border2; e.currentTarget.style.color = C.text3 }}>
                + Adicionar
              </button>
            </div>
          )
        })}
      </div>

      {/* Modal */}
      {modal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
          onMouseDown={e => { if (e.target === e.currentTarget) { setModal(false); setEditando(null) } }}>
          <div style={{ ...S.card, width: 'min(520px, 95vw)', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 24px 64px rgba(0,0,0,0.6)' }}>
            <div style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: 15, fontWeight: 700, color: C.text1, marginBottom: 18 }}>
              {editando ? 'Editar lead' : 'Novo lead'}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
              <div style={{ gridColumn: '1/-1' }}>
                <label style={S.lbl}>Nome *</label>
                <input style={S.inp} value={form.nome} onChange={e => setForm({...form, nome: e.target.value})} placeholder="Nome do contato" autoFocus />
              </div>
              <div><label style={S.lbl}>Empresa</label><input style={S.inp} value={form.empresa} onChange={e => setForm({...form, empresa: e.target.value})} placeholder="Empresa" /></div>
              <div><label style={S.lbl}>Cargo</label><input style={S.inp} value={form.cargo} onChange={e => setForm({...form, cargo: e.target.value})} placeholder="Cargo" /></div>
              <div><label style={S.lbl}>WhatsApp</label><input style={S.inp} value={form.whatsapp} onChange={e => setForm({...form, whatsapp: e.target.value})} placeholder="(81) 99999-9999" /></div>
              <div><label style={S.lbl}>E-mail</label><input style={S.inp} type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} placeholder="email@exemplo.com" /></div>
              <div><label style={S.lbl}>Produto / Serviço</label><input style={S.inp} value={form.servico} onChange={e => setForm({...form, servico: e.target.value})} placeholder="O que está sendo negociado" /></div>
              <div><label style={S.lbl}>Valor potencial (R$)</label><input style={S.inp} type="number" value={form.valor} onChange={e => setForm({...form, valor: e.target.value})} placeholder="0" /></div>
              <div>
                <label style={S.lbl}>Etapa</label>
                <select style={S.inp} value={form.etapa} onChange={e => setForm({...form, etapa: e.target.value})}>
                  {ETAPAS.map(e => <option key={e.id} value={e.id}>{e.label}</option>)}
                </select>
              </div>
              <div>
                <label style={S.lbl}>Temperatura</label>
                <select style={S.inp} value={form.temperatura} onChange={e => setForm({...form, temperatura: e.target.value})}>
                  <option value="frio">🧊 Frio</option>
                  <option value="morno">🌡️ Morno</option>
                  <option value="quente">🔥 Quente</option>
                </select>
              </div>
              <div style={{ gridColumn: '1/-1' }}>
                <label style={S.lbl}>Próximo follow-up</label>
                <input style={S.inp} type="date" value={form.proximo_followup || ''} onChange={e => setForm({...form, proximo_followup: e.target.value})} />
              </div>
              <div style={{ gridColumn: '1/-1' }}>
                <label style={S.lbl}>Observações</label>
                <textarea style={{ ...S.inp, resize: 'vertical' }} rows={3} value={form.observacao || ''} onChange={e => setForm({...form, observacao: e.target.value})} placeholder="Notas, histórico, próximos passos..." />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button style={S.btnGhost} onClick={() => { setModal(false); setEditando(null) }}>Cancelar</button>
              <button style={{ ...S.btn, opacity: !form.nome ? 0.6 : 1 }} onClick={salvar} disabled={!form.nome}>Salvar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Tarefas ───────────────────────────────────────────────
function Tarefas({ empresaId }) {
  const [tarefas, setTarefas] = useState([])
  const [leads, setLeads] = useState([])
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({ titulo: '', descricao: '', prioridade: 'normal', data_limite: '', lead_id: '' })
  const hoje = new Date().toISOString().split('T')[0]

  useEffect(() => {
    supabase.from('crm_tarefas').select('*').eq('empresa_id', empresaId).order('data_limite').then(({ data }) => setTarefas(data || []))
    supabase.from('crm_leads').select('id, nome, empresa').eq('empresa_id', empresaId).order('nome').then(({ data }) => setLeads(data || []))
  }, [empresaId])

  async function salvar() {
    if (!form.titulo) return
    await supabase.from('crm_tarefas').insert({ ...form, empresa_id: empresaId })
    setModal(false); setForm({ titulo: '', descricao: '', prioridade: 'normal', data_limite: '', lead_id: '' })
    const { data } = await supabase.from('crm_tarefas').select('*').eq('empresa_id', empresaId).order('data_limite')
    setTarefas(data || [])
  }

  async function toggle(id, concluida) {
    setTarefas(ts => ts.map(t => t.id === id ? { ...t, concluida: !concluida } : t))
    await supabase.from('crm_tarefas').update({ concluida: !concluida }).eq('id', id)
  }

  async function deletar(id) {
    setTarefas(ts => ts.filter(t => t.id !== id))
    await supabase.from('crm_tarefas').delete().eq('id', id)
  }

  const pendentes = tarefas.filter(t => !t.concluida)
  const concluidas = tarefas.filter(t => t.concluida)

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: 18, fontWeight: 700, color: C.text1 }}>Tarefas</div>
        <button style={S.btn} onClick={() => setModal(true)}>+ Nova Tarefa</button>
      </div>
      {pendentes.length === 0 && concluidas.length === 0 && (
        <div style={{ textAlign: 'center', padding: 40, color: C.text3, fontSize: 12 }}>Nenhuma tarefa. Crie a primeira!</div>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {pendentes.map(t => {
          const atrasada = t.data_limite && t.data_limite < hoje
          const lead = leads.find(l => l.id === t.lead_id)
          return (
            <div key={t.id} style={{ ...S.card, display: 'flex', alignItems: 'flex-start', gap: 10, padding: 12, borderLeft: `3px solid ${PRIOR_COR[t.prioridade]}` }}>
              <button onClick={() => toggle(t.id, t.concluida)}
                style={{ width: 18, height: 18, borderRadius: 5, border: `1.5px solid ${C.border2}`, background: 'transparent', flexShrink: 0, cursor: 'pointer', marginTop: 1 }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: C.text1, marginBottom: 2 }}>{t.titulo}</div>
                {t.descricao && <div style={{ fontSize: 11, color: C.text3, marginBottom: 4 }}>{t.descricao}</div>}
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {lead && <span style={{ fontSize: 10, color: C.sky }}>🔗 {lead.nome} {lead.empresa ? `(${lead.empresa})` : ''}</span>}
                  {t.data_limite && <span style={{ fontSize: 10, color: atrasada ? C.red : C.text3, fontWeight: atrasada ? 700 : 400 }}>{atrasada ? '⚠️ ' : '📅 '}{new Date(t.data_limite + 'T12:00:00').toLocaleDateString('pt-BR')}</span>}
                  <span style={{ fontSize: 10, color: PRIOR_COR[t.prioridade], fontWeight: 600 }}>{t.prioridade.toUpperCase()}</span>
                </div>
              </div>
              <button onClick={() => deletar(t.id)} style={{ background: 'none', border: 'none', color: C.text3, cursor: 'pointer', fontSize: 12, flexShrink: 0 }}>✕</button>
            </div>
          )
        })}
        {concluidas.length > 0 && (
          <div style={{ marginTop: 12 }}>
            <div style={{ fontSize: 10, color: C.text3, letterSpacing: '0.5px', marginBottom: 6, textTransform: 'uppercase' }}>Concluídas ({concluidas.length})</div>
            {concluidas.map(t => (
              <div key={t.id} style={{ ...S.card, display: 'flex', alignItems: 'center', gap: 10, padding: 10, opacity: 0.55, marginBottom: 4 }}>
                <button onClick={() => toggle(t.id, t.concluida)}
                  style={{ width: 18, height: 18, borderRadius: 5, border: 'none', background: C.green, flexShrink: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="10" height="10" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="#fff" strokeWidth="1.5" strokeLinecap="round"/></svg>
                </button>
                <span style={{ fontSize: 12, color: C.text3, textDecoration: 'line-through', flex: 1 }}>{t.titulo}</span>
                <button onClick={() => deletar(t.id)} style={{ background: 'none', border: 'none', color: C.text3, cursor: 'pointer', fontSize: 11 }}>✕</button>
              </div>
            ))}
          </div>
        )}
      </div>
      {modal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
          onMouseDown={e => { if (e.target === e.currentTarget) setModal(false) }}>
          <div style={{ ...S.card, width: 'min(420px, 95vw)', boxShadow: '0 24px 64px rgba(0,0,0,0.6)' }}>
            <div style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: 15, fontWeight: 700, color: C.text1, marginBottom: 16 }}>Nova Tarefa</div>
            <div style={{ display: 'grid', gap: 12, marginBottom: 14 }}>
              <div><label style={S.lbl}>Título *</label><input style={S.inp} value={form.titulo} onChange={e => setForm({...form, titulo: e.target.value})} placeholder="O que precisa ser feito?" autoFocus /></div>
              <div><label style={S.lbl}>Descrição</label><textarea style={{ ...S.inp, resize: 'vertical' }} rows={2} value={form.descricao} onChange={e => setForm({...form, descricao: e.target.value})} /></div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div><label style={S.lbl}>Prioridade</label>
                  <select style={S.inp} value={form.prioridade} onChange={e => setForm({...form, prioridade: e.target.value})}>
                    <option value="baixa">Baixa</option><option value="normal">Normal</option><option value="alta">Alta</option>
                  </select>
                </div>
                <div><label style={S.lbl}>Data limite</label><input style={S.inp} type="date" value={form.data_limite} onChange={e => setForm({...form, data_limite: e.target.value})} /></div>
              </div>
              <div><label style={S.lbl}>Lead relacionado</label>
                <select style={S.inp} value={form.lead_id} onChange={e => setForm({...form, lead_id: e.target.value})}>
                  <option value="">— Nenhum</option>
                  {leads.map(l => <option key={l.id} value={l.id}>{l.nome} {l.empresa ? `(${l.empresa})` : ''}</option>)}
                </select>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button style={S.btnGhost} onClick={() => setModal(false)}>Cancelar</button>
              <button style={{ ...S.btn, opacity: !form.titulo ? 0.6 : 1 }} onClick={salvar} disabled={!form.titulo}>Salvar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Agenda ────────────────────────────────────────────────
function Agenda({ empresaId }) {
  const [eventos, setEventos] = useState([])
  const [leads, setLeads] = useState([])
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({ titulo: '', descricao: '', inicio: '', fim: '', tipo: 'reuniao', lead_id: '' })
  const TIPOS = { reuniao: '🤝', ligacao: '📞', visita: '🚗', apresentacao: '📊', outro: '📌' }

  useEffect(() => {
    const now = new Date().toISOString()
    supabase.from('crm_eventos').select('*').eq('empresa_id', empresaId).gte('inicio', now).order('inicio').limit(30).then(({ data }) => setEventos(data || []))
    supabase.from('crm_leads').select('id, nome, empresa').eq('empresa_id', empresaId).order('nome').then(({ data }) => setLeads(data || []))
  }, [empresaId])

  async function salvar() {
    if (!form.titulo || !form.inicio) return
    await supabase.from('crm_eventos').insert({ ...form, empresa_id: empresaId })
    setModal(false); setForm({ titulo: '', descricao: '', inicio: '', fim: '', tipo: 'reuniao', lead_id: '' })
    const now = new Date().toISOString()
    const { data } = await supabase.from('crm_eventos').select('*').eq('empresa_id', empresaId).gte('inicio', now).order('inicio').limit(30)
    setEventos(data || [])
  }

  async function deletar(id) {
    setEventos(es => es.filter(e => e.id !== id))
    await supabase.from('crm_eventos').delete().eq('id', id)
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: 18, fontWeight: 700, color: C.text1 }}>Agenda</div>
        <button style={S.btn} onClick={() => setModal(true)}>+ Novo Evento</button>
      </div>
      {eventos.length === 0 && <div style={{ textAlign: 'center', padding: 40, color: C.text3, fontSize: 12 }}>Nenhum evento próximo.</div>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {eventos.map(ev => {
          const ini = new Date(ev.inicio)
          const lead = leads.find(l => l.id === ev.lead_id)
          return (
            <div key={ev.id} style={{ ...S.card, display: 'flex', gap: 14, alignItems: 'flex-start' }}>
              <div style={{ width: 44, height: 44, borderRadius: 10, background: 'rgba(226,192,120,0.1)', border: `1px solid rgba(226,192,120,0.2)`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <div style={{ fontSize: 9, color: C.accent, fontWeight: 700, textTransform: 'uppercase' }}>{ini.toLocaleDateString('pt-BR', { month: 'short' })}</div>
                <div style={{ fontSize: 18, fontWeight: 800, color: C.accent, lineHeight: 1, fontFamily: 'Space Grotesk, sans-serif' }}>{ini.getDate()}</div>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: C.text1, marginBottom: 2 }}>
                  {TIPOS[ev.tipo] || '📌'} {ev.titulo}
                </div>
                <div style={{ fontSize: 11, color: C.text3, marginBottom: 4 }}>{ini.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}{ev.fim ? ` → ${new Date(ev.fim).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}` : ''}</div>
                {lead && <div style={{ fontSize: 11, color: C.sky }}>🔗 {lead.nome} {lead.empresa ? `(${lead.empresa})` : ''}</div>}
                {ev.descricao && <div style={{ fontSize: 11, color: C.text3, marginTop: 4 }}>{ev.descricao}</div>}
              </div>
              <button onClick={() => deletar(ev.id)} style={{ background: 'none', border: 'none', color: C.text3, cursor: 'pointer', fontSize: 12 }}>✕</button>
            </div>
          )
        })}
      </div>
      {modal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
          onMouseDown={e => { if (e.target === e.currentTarget) setModal(false) }}>
          <div style={{ ...S.card, width: 'min(420px, 95vw)', boxShadow: '0 24px 64px rgba(0,0,0,0.6)' }}>
            <div style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: 15, fontWeight: 700, color: C.text1, marginBottom: 16 }}>Novo Evento</div>
            <div style={{ display: 'grid', gap: 12, marginBottom: 14 }}>
              <div><label style={S.lbl}>Título *</label><input style={S.inp} value={form.titulo} onChange={e => setForm({...form, titulo: e.target.value})} placeholder="Reunião com cliente, ligação..." autoFocus /></div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div><label style={S.lbl}>Início *</label><input style={S.inp} type="datetime-local" value={form.inicio} onChange={e => setForm({...form, inicio: e.target.value})} /></div>
                <div><label style={S.lbl}>Fim</label><input style={S.inp} type="datetime-local" value={form.fim} onChange={e => setForm({...form, fim: e.target.value})} /></div>
              </div>
              <div><label style={S.lbl}>Tipo</label>
                <select style={S.inp} value={form.tipo} onChange={e => setForm({...form, tipo: e.target.value})}>
                  <option value="reuniao">🤝 Reunião</option><option value="ligacao">📞 Ligação</option>
                  <option value="visita">🚗 Visita</option><option value="apresentacao">📊 Apresentação</option><option value="outro">📌 Outro</option>
                </select>
              </div>
              <div><label style={S.lbl}>Lead relacionado</label>
                <select style={S.inp} value={form.lead_id} onChange={e => setForm({...form, lead_id: e.target.value})}>
                  <option value="">— Nenhum</option>
                  {leads.map(l => <option key={l.id} value={l.id}>{l.nome} {l.empresa ? `(${l.empresa})` : ''}</option>)}
                </select>
              </div>
              <div><label style={S.lbl}>Descrição</label><textarea style={{ ...S.inp, resize: 'vertical' }} rows={2} value={form.descricao} onChange={e => setForm({...form, descricao: e.target.value})} /></div>
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button style={S.btnGhost} onClick={() => setModal(false)}>Cancelar</button>
              <button style={{ ...S.btn, opacity: (!form.titulo || !form.inicio) ? 0.6 : 1 }} onClick={salvar} disabled={!form.titulo || !form.inicio}>Salvar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── PORTAL PRINCIPAL ──────────────────────────────────────
export default function CRMAccess() {
  const [empresa, setEmpresa] = useState(null)
  const [aba, setAba] = useState('pipeline')

  function onLogin(emp) {
    // Verifica vencimento
    const venc = emp.vencimento ? new Date(emp.vencimento + 'T23:59:59') : null
    if (emp.status === 'bloqueado' || (venc && venc < new Date())) {
      setEmpresa({ ...emp, status: 'bloqueado' })
    } else {
      setEmpresa(emp)
    }
  }

  if (!empresa) return <Login onLogin={onLogin} />
  if (empresa.status === 'bloqueado') return <TelaBloqueada empresa={empresa} onLogout={() => setEmpresa(null)} />

  const diasRestantes = empresa.vencimento
    ? Math.ceil((new Date(empresa.vencimento + 'T23:59:59') - new Date()) / (1000 * 60 * 60 * 24))
    : null

  const NAV = [
    { id: 'pipeline', label: '⚡ Pipeline' },
    { id: 'tarefas', label: '✓ Tarefas' },
    { id: 'agenda', label: '📅 Agenda' },
  ]

  return (
    <div style={{ minHeight: '100vh', background: C.bg0, fontFamily: 'DM Sans, sans-serif', color: C.text1 }}>
      {/* Topbar */}
      <div style={{ background: C.bg1, borderBottom: `1px solid ${C.border}`, padding: '0 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 52, position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: 16, fontWeight: 800 }}>
            Flow<span style={{ color: C.accent }}>CRM</span>
          </div>
          <div style={{ width: 1, height: 18, background: C.border }} />
          <div style={{ fontSize: 12, color: C.text2 }}>{empresa.nome}</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {diasRestantes !== null && diasRestantes <= 10 && (
            <div style={{ fontSize: 11, color: diasRestantes <= 3 ? C.red : C.amber, background: `${diasRestantes <= 3 ? C.red : C.amber}15`, border: `1px solid ${diasRestantes <= 3 ? C.red : C.amber}30`, borderRadius: 6, padding: '4px 10px', fontWeight: 600 }}>
              ⚠️ Plano vence em {diasRestantes} dia{diasRestantes !== 1 ? 's' : ''}
            </div>
          )}
          {diasRestantes !== null && diasRestantes > 10 && (
            <div style={{ fontSize: 11, color: C.text3 }}>
              Plano: <span style={{ color: C.accent }}>{empresa.plano === '3meses' ? '3 meses' : '1 mês'}</span> · vence {new Date(empresa.vencimento + 'T12:00:00').toLocaleDateString('pt-BR')}
            </div>
          )}
          <button onClick={() => setEmpresa(null)} style={{ background: 'none', border: 'none', color: C.text3, cursor: 'pointer', fontSize: 12 }}>Sair</button>
        </div>
      </div>

      {/* Navegação */}
      <div style={{ background: C.bg1, borderBottom: `1px solid ${C.border}`, padding: '0 20px', display: 'flex', gap: 2 }}>
        {NAV.map(n => (
          <button key={n.id} onClick={() => setAba(n.id)}
            style={{ background: 'none', border: 'none', borderBottom: aba === n.id ? `2px solid ${C.accent}` : '2px solid transparent', padding: '10px 16px', fontSize: 12, fontWeight: 600, color: aba === n.id ? C.accent : C.text3, cursor: 'pointer', marginBottom: -1, transition: 'color 0.15s', fontFamily: 'DM Sans, sans-serif' }}>
            {n.label}
          </button>
        ))}
      </div>

      {/* Conteúdo */}
      <div style={{ padding: 24, maxWidth: 1200, margin: '0 auto' }}>
        {aba === 'pipeline' && <Pipeline empresaId={empresa.id} />}
        {aba === 'tarefas' && <Tarefas empresaId={empresa.id} />}
        {aba === 'agenda' && <Agenda empresaId={empresa.id} />}
      </div>

      <style>{`* { box-sizing: border-box; } ::-webkit-scrollbar { width: 4px; height: 4px; } ::-webkit-scrollbar-thumb { background: #1A231C; border-radius: 2px; }`}</style>
    </div>
  )
}
