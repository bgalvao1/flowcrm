import React, { useState, useEffect } from 'react'
import { supabase, mensagensAPI } from '../lib/supabase.js'

// ── Tela de BLOQUEIO ─────────────────────────────────────
function TelaBloqueada({ cliente, onLogout }) {
  const venc = cliente.saas_proximo_vencimento
    ? new Date(cliente.saas_proximo_vencimento + 'T12:00:00').toLocaleDateString('pt-BR')
    : null

  return (
    <div style={{ minHeight: '100vh', background: '#0A0D0B', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'DM Sans, sans-serif' }}>
      <div style={{ background: '#131A15', border: '1px solid #1E2821', borderRadius: 16, padding: 40, maxWidth: 440, width: '90%', textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🔒</div>
        <div style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: 22, fontWeight: 700, color: '#EEF3EE', marginBottom: 8 }}>
          Acesso suspenso
        </div>
        <div style={{ fontSize: 13, color: '#9CAC9F', marginBottom: 24, lineHeight: 1.6 }}>
          {cliente.saas_status === 'bloqueado' && venc
            ? `Seu período de trial encerrou em ${venc}. Para continuar usando o CRM, realize o pagamento da mensalidade.`
            : 'Seu acesso está temporariamente suspenso. Entre em contato para regularizar.'}
        </div>

        {/* Box de pagamento */}
        <div style={{ background: 'rgba(226,192,120,0.08)', border: '1px solid rgba(226,192,120,0.2)', borderRadius: 12, padding: 20, marginBottom: 20 }}>
          <div style={{ fontSize: 11, color: '#9CAC9F', marginBottom: 4, letterSpacing: '0.5px', textTransform: 'uppercase' }}>Mensalidade</div>
          <div style={{ fontSize: 32, fontWeight: 800, color: '#E2C078', fontFamily: 'JetBrains Mono, monospace', marginBottom: 8 }}>
            R$ {Number(cliente.saas_mensalidade || 97).toLocaleString('pt-BR')}
          </div>
          <div style={{ fontSize: 12, color: '#9CAC9F', marginBottom: 12 }}>Pague via PIX e envie o comprovante</div>
          <div style={{ background: '#1A231C', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#E2C078', fontWeight: 600, letterSpacing: '0.3px', wordBreak: 'break-all' }}>
            {cliente.saas_pix_chave || 'bgalvao1@gmail.com'}
          </div>
          <button
            onClick={() => navigator.clipboard.writeText(cliente.saas_pix_chave || 'bgalvao1@gmail.com')}
            style={{ marginTop: 10, background: 'rgba(226,192,120,0.12)', border: '1px solid rgba(226,192,120,0.3)', borderRadius: 7, padding: '7px 16px', fontSize: 12, color: '#E2C078', cursor: 'pointer' }}>
            📋 Copiar chave PIX
          </button>
        </div>

        <div style={{ fontSize: 12, color: '#5D6C60', marginBottom: 20 }}>
          Após o pagamento, entre em contato com a Flow Agency via WhatsApp para liberar o acesso. Seus dados estão seguros e não serão perdidos.
        </div>
        <button onClick={onLogout} style={{ background: 'none', border: 'none', color: '#5D6C60', fontSize: 12, cursor: 'pointer' }}>Sair</button>
      </div>
    </div>
  )
}

// ── Pipeline de leads do cliente ──────────────────────────
const ETAPAS = [
  { id: 'prospeccao', label: 'Prospecção', cor: '#8B9A8E' },
  { id: 'qualificacao', label: 'Qualificação', cor: '#5FB7E8' },
  { id: 'proposta', label: 'Proposta', cor: '#EFB454' },
  { id: 'fechado', label: 'Fechado', cor: '#3DCE8C' },
  { id: 'perdido', label: 'Perdido', cor: '#E8645B' },
]

function MiniCRM({ clienteId }) {
  const [leads, setLeads] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({ nome: '', empresa: '', whatsapp: '', servico: '', valor: '', etapa: 'prospeccao', observacao: '' })
  const [saving, setSaving] = useState(false)

  useEffect(() => { loadLeads() }, [clienteId])

  async function loadLeads() {
    setLoading(true)
    const { data } = await supabase.from('cliente_leads').select('*').eq('cliente_id', clienteId).order('criado_em', { ascending: false })
    setLeads(data || [])
    setLoading(false)
  }

  async function salvar() {
    if (!form.nome) return
    setSaving(true)
    await supabase.from('cliente_leads').insert({ ...form, cliente_id: clienteId, valor: parseFloat(form.valor) || 0 })
    setSaving(false)
    setModal(false)
    setForm({ nome: '', empresa: '', whatsapp: '', servico: '', valor: '', etapa: 'prospeccao', observacao: '' })
    await loadLeads()
  }

  async function moverEtapa(id, etapa) {
    setLeads(ls => ls.map(l => l.id === id ? { ...l, etapa } : l))
    await supabase.from('cliente_leads').update({ etapa, atualizado_em: new Date().toISOString() }).eq('id', id)
  }

  async function deletar(id) {
    if (!confirm('Excluir este lead?')) return
    setLeads(ls => ls.filter(l => l.id !== id))
    await supabase.from('cliente_leads').delete().eq('id', id)
  }

  const inp = { width: '100%', background: '#1A231C', border: '1px solid #2B382F', borderRadius: 7, padding: '8px 12px', color: '#EEF3EE', fontSize: 12, outline: 'none', fontFamily: 'DM Sans, sans-serif', marginBottom: 10 }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <div style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: 18, fontWeight: 700, color: '#EEF3EE' }}>Meus Leads</div>
          <div style={{ fontSize: 11, color: '#5D6C60', marginTop: 2 }}>Gerencie seu pipeline de vendas</div>
        </div>
        <button onClick={() => setModal(true)}
          style={{ background: 'linear-gradient(135deg,#E2C078,#D98E4A)', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 12, fontWeight: 600, color: '#181208', cursor: 'pointer' }}>
          + Novo Lead
        </button>
      </div>

      {/* Totais */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {ETAPAS.map(e => {
          const n = leads.filter(l => l.etapa === e.id).length
          const total = leads.filter(l => l.etapa === e.id).reduce((a, l) => a + Number(l.valor || 0), 0)
          return (
            <div key={e.id} style={{ background: '#131A15', border: '1px solid #1E2821', borderRadius: 8, padding: '8px 12px', borderTop: `2px solid ${e.cor}`, flex: 1, minWidth: 100 }}>
              <div style={{ fontSize: 9, color: e.cor, fontWeight: 600, letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: 3 }}>{e.label}</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#EEF3EE', fontFamily: 'JetBrains Mono, monospace' }}>{n}</div>
              {total > 0 && <div style={{ fontSize: 9, color: '#5D6C60', marginTop: 1 }}>R$ {total.toLocaleString('pt-BR')}</div>}
            </div>
          )
        })}
      </div>

      {/* Kanban */}
      <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 8 }}>
        {ETAPAS.map(etapa => {
          const col = leads.filter(l => l.etapa === etapa.id)
          return (
            <div key={etapa.id} style={{ minWidth: 200, background: '#0E1310', border: '1px solid #1E2821', borderRadius: 10, padding: 10, flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 600, color: etapa.cor }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: etapa.cor }} />{etapa.label}
                </div>
                <span style={{ fontSize: 10, background: '#1A231C', borderRadius: 8, padding: '1px 6px', color: '#5D6C60' }}>{col.length}</span>
              </div>
              {loading && <div style={{ height: 60, background: '#1A231C', borderRadius: 7, marginBottom: 6, animation: 'pulse 1.5s ease infinite' }} />}
              {col.map(lead => (
                <div key={lead.id} style={{ background: '#131A15', border: '1px solid #2B382F', borderRadius: 8, padding: 10, marginBottom: 7, cursor: 'default' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#EEF3EE', marginBottom: 2, flex: 1 }}>{lead.nome}</div>
                    <button onClick={() => deletar(lead.id)} style={{ background: 'none', border: 'none', color: '#5D6C60', cursor: 'pointer', fontSize: 11, padding: 0, marginLeft: 4 }}>✕</button>
                  </div>
                  {lead.empresa && <div style={{ fontSize: 10, color: '#5D6C60', marginBottom: 4 }}>{lead.empresa}</div>}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                    {lead.valor > 0 && <span style={{ fontSize: 12, fontWeight: 700, color: '#3DCE8C', fontFamily: 'JetBrains Mono, monospace' }}>R$ {Number(lead.valor).toLocaleString('pt-BR')}</span>}
                    {lead.servico && <span style={{ fontSize: 9, padding: '2px 6px', borderRadius: 4, background: 'rgba(226,192,120,0.12)', color: '#E2C078', fontWeight: 600 }}>{lead.servico}</span>}
                  </div>
                  {lead.whatsapp && (
                    <a href={`https://wa.me/55${lead.whatsapp.replace(/\D/g,'')}`} target="_blank" rel="noreferrer"
                      style={{ fontSize: 10, color: '#3DCE8C', textDecoration: 'none', display: 'block', marginBottom: 6 }}>
                      💬 {lead.whatsapp}
                    </a>
                  )}
                  {/* Mover etapa */}
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                    {ETAPAS.map(e => (
                      <button key={e.id} onClick={() => e.id !== lead.etapa && moverEtapa(lead.id, e.id)}
                        title={`Mover para ${e.label}`}
                        style={{ width: 14, height: 14, borderRadius: 3, border: 'none', padding: 0, background: e.id === lead.etapa ? e.cor : '#1A231C', cursor: e.id === lead.etapa ? 'default' : 'pointer', transition: 'transform 0.1s' }}
                        onMouseEnter={ev => { if (e.id !== lead.etapa) ev.currentTarget.style.transform = 'scale(1.3)' }}
                        onMouseLeave={ev => ev.currentTarget.style.transform = 'scale(1)'}
                      />
                    ))}
                  </div>
                </div>
              ))}
              <button onClick={() => { setForm(f => ({...f, etapa: etapa.id})); setModal(true) }}
                style={{ width: '100%', border: '1px dashed #2B382F', borderRadius: 6, padding: 6, fontSize: 10, color: '#5D6C60', background: 'none', cursor: 'pointer' }}>
                + Adicionar
              </button>
            </div>
          )
        })}
      </div>

      {/* Modal novo lead */}
      {modal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(5,7,6,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
          onMouseDown={e => { if (e.target === e.currentTarget) setModal(false) }}>
          <div style={{ background: '#131A15', border: '1px solid #2B382F', borderRadius: 14, padding: 24, width: 'min(400px, 95vw)', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: 16, fontWeight: 700, color: '#EEF3EE', marginBottom: 16 }}>Novo Lead</div>
            <label style={{ fontSize: 10, color: '#5D6C60', display: 'block', marginBottom: 4, letterSpacing: '0.5px', textTransform: 'uppercase' }}>Nome *</label>
            <input style={inp} value={form.nome} onChange={e => setForm({...form, nome: e.target.value})} placeholder="Nome do lead" autoFocus />
            <label style={{ fontSize: 10, color: '#5D6C60', display: 'block', marginBottom: 4, letterSpacing: '0.5px', textTransform: 'uppercase' }}>Empresa</label>
            <input style={inp} value={form.empresa} onChange={e => setForm({...form, empresa: e.target.value})} placeholder="Empresa" />
            <label style={{ fontSize: 10, color: '#5D6C60', display: 'block', marginBottom: 4, letterSpacing: '0.5px', textTransform: 'uppercase' }}>WhatsApp</label>
            <input style={inp} value={form.whatsapp} onChange={e => setForm({...form, whatsapp: e.target.value})} placeholder="(81) 99999-9999" />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <div>
                <label style={{ fontSize: 10, color: '#5D6C60', display: 'block', marginBottom: 4, letterSpacing: '0.5px', textTransform: 'uppercase' }}>Serviço</label>
                <input style={inp} value={form.servico} onChange={e => setForm({...form, servico: e.target.value})} placeholder="Ex: Site" />
              </div>
              <div>
                <label style={{ fontSize: 10, color: '#5D6C60', display: 'block', marginBottom: 4, letterSpacing: '0.5px', textTransform: 'uppercase' }}>Valor (R$)</label>
                <input style={inp} type="number" value={form.valor} onChange={e => setForm({...form, valor: e.target.value})} placeholder="0" />
              </div>
            </div>
            <label style={{ fontSize: 10, color: '#5D6C60', display: 'block', marginBottom: 4, letterSpacing: '0.5px', textTransform: 'uppercase' }}>Etapa</label>
            <select style={inp} value={form.etapa} onChange={e => setForm({...form, etapa: e.target.value})}>
              {ETAPAS.map(e => <option key={e.id} value={e.id}>{e.label}</option>)}
            </select>
            <label style={{ fontSize: 10, color: '#5D6C60', display: 'block', marginBottom: 4, letterSpacing: '0.5px', textTransform: 'uppercase' }}>Observação</label>
            <textarea style={{ ...inp, resize: 'vertical' }} rows={2} value={form.observacao} onChange={e => setForm({...form, observacao: e.target.value})} placeholder="Notas..." />
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
              <button onClick={() => setModal(false)} style={{ background: 'none', border: '1px solid #2B382F', borderRadius: 7, padding: '7px 14px', fontSize: 12, color: '#9CAC9F', cursor: 'pointer' }}>Cancelar</button>
              <button onClick={salvar} disabled={!form.nome || saving}
                style={{ background: 'linear-gradient(135deg,#E2C078,#D98E4A)', border: 'none', borderRadius: 7, padding: '7px 14px', fontSize: 12, fontWeight: 600, color: '#181208', cursor: 'pointer', opacity: !form.nome || saving ? 0.6 : 1 }}>
                {saving ? 'Salvando...' : 'Salvar lead'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── PORTAL PRINCIPAL ──────────────────────────────────────
export default function Portal() {
  const [logado, setLogado] = useState(false)
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')
  const [loading, setLoading] = useState(false)
  const [pview, setPview] = useState('crm')
  const [perfil, setPerfil] = useState(null)
  const [projetos, setProjetos] = useState([])
  const [msgs, setMsgs] = useState([])
  const [novaMsg, setNovaMsg] = useState([])
  const [clientes, setClientes] = useState([])

  async function handleLogin(e) {
    e.preventDefault()
    setErro('')
    setLoading(true)

    // 1. Tentar como CLIENTE com senha SaaS
    const { data: cliente } = await supabase
      .from('clientes')
      .select('*')
      .ilike('email', email.trim().toLowerCase())
      .single()

    if (cliente) {
      // Verifica senha do portal SaaS
      if (cliente.saas_senha && cliente.saas_senha !== senha) {
        setErro('Senha incorreta.')
        setLoading(false)
        return
      }

      // Verifica se trial expirou
      if (cliente.saas_status === 'trial' && cliente.saas_trial_fim) {
        if (new Date(cliente.saas_trial_fim) < new Date()) {
          await supabase.from('clientes').update({ saas_status: 'bloqueado', saas_ativo: false }).eq('id', cliente.id)
          cliente.saas_status = 'bloqueado'
          cliente.saas_ativo = false
        }
      }

      const { data: p } = await supabase.from('projetos').select('*, tarefas(*), entregas(*)').eq('cliente_id', cliente.id)
      const { data: m } = await mensagensAPI.listar(cliente.id)
      mensagensAPI.assinar(cliente.id, msg => setMsgs(prev => [...prev, msg]))
      setPerfil({ tipo: 'cliente', dados: { ...cliente } })
      setProjetos(p || [])
      setMsgs(m || [])
      setLogado(true)
      setLoading(false)
      return
    }

    // 2. Tentar como COLABORADOR
    const { data: colab } = await supabase.from('colaboradores').select('*').ilike('portal_email', email.trim().toLowerCase()).eq('ativo', true).single()
    if (colab) {
      const { data: cp } = await supabase.from('colaborador_projetos').select('projeto_id').eq('colaborador_id', colab.id)
      let projetosColab = []
      if (cp && cp.length > 0) {
        const ids = cp.map(x => x.projeto_id)
        const { data: p } = await supabase.from('projetos').select('*, clientes(nome, cor, iniciais), tarefas(*)').in('id', ids)
        projetosColab = p || []
      }
      const { data: cl } = await supabase.from('clientes').select('id, nome, status, mrr, segmento').order('nome')
      setPerfil({ tipo: 'colaborador', dados: colab })
      setProjetos(projetosColab)
      setClientes(cl || [])
      setLogado(true)
      setLoading(false)
      return
    }

    setErro('E-mail não encontrado ou senha incorreta.')
    setLoading(false)
  }

  async function enviarMsg() {
    if (!novaMsg.trim()) return
    await mensagensAPI.enviar(perfil.dados.id, 'cliente', perfil.dados.nome, novaMsg.trim())
    setNovaMsg('')
  }

  if (!logado) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#0A0D0B', fontFamily: 'DM Sans, sans-serif' }}>
        <div style={{ background: '#131A15', border: '1px solid #2B382F', borderRadius: 14, padding: '32px 28px', width: 320 }}>
          <div style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: 22, fontWeight: 700, marginBottom: 2 }}>
            Flow<span style={{ color: '#E2C078' }}>CRM</span>
          </div>
          <div style={{ fontSize: 11, color: '#5D6C60', marginBottom: 24, letterSpacing: '0.5px' }}>PORTAL DO CLIENTE</div>
          <form onSubmit={handleLogin}>
            <label style={{ fontSize: 10, color: '#5D6C60', display: 'block', marginBottom: 4, letterSpacing: '0.8px', textTransform: 'uppercase' }}>E-mail</label>
            <input value={email} onChange={e => setEmail(e.target.value)} type="email" required placeholder="seu@email.com"
              style={{ width: '100%', background: '#1A231C', border: '1px solid #2B382F', borderRadius: 7, padding: '9px 12px', color: '#EEF3EE', fontSize: 13, marginBottom: 12, outline: 'none' }} />
            <label style={{ fontSize: 10, color: '#5D6C60', display: 'block', marginBottom: 4, letterSpacing: '0.8px', textTransform: 'uppercase' }}>Senha</label>
            <input value={senha} onChange={e => setSenha(e.target.value)} type="password" required placeholder="••••••••"
              style={{ width: '100%', background: '#1A231C', border: '1px solid #2B382F', borderRadius: 7, padding: '9px 12px', color: '#EEF3EE', fontSize: 13, marginBottom: 16, outline: 'none' }} />
            {erro && <div style={{ fontSize: 11, color: '#E8645B', marginBottom: 12, background: 'rgba(232,100,91,0.08)', border: '1px solid rgba(232,100,91,0.2)', borderRadius: 6, padding: '7px 10px' }}>{erro}</div>}
            <button type="submit" disabled={loading}
              style={{ width: '100%', background: 'linear-gradient(135deg,#E2C078,#D98E4A)', border: 'none', borderRadius: 7, padding: 10, fontSize: 13, fontWeight: 600, color: '#181208', cursor: 'pointer', opacity: loading ? 0.7 : 1 }}>
              {loading ? 'Entrando...' : 'Acessar portal'}
            </button>
          </form>
        </div>
      </div>
    )
  }

  // TELA DE BLOQUEIO para clientes SaaS
  if (perfil.tipo === 'cliente' && (perfil.dados.saas_status === 'bloqueado' || (!perfil.dados.saas_ativo && perfil.dados.saas_status !== null && perfil.dados.saas_status !== 'inativo'))) {
    return <TelaBloqueada cliente={perfil.dados} onLogout={() => { setLogado(false); setPerfil(null) }} />
  }

  // AVISO de trial expirando (menos de 2 dias)
  const trialAlerta = perfil.tipo === 'cliente' && perfil.dados.saas_status === 'trial' && perfil.dados.saas_trial_fim
    ? Math.ceil((new Date(perfil.dados.saas_trial_fim) - new Date()) / (1000 * 60 * 60 * 24))
    : null

  const isCliente = perfil.tipo === 'cliente'
  const navItems = isCliente
    ? ['crm', 'projetos', 'mensagens']
    : ['inicio', 'projetos', 'clientes']
  const navLabel = { crm: 'Meus Leads', inicio: 'Início', projetos: 'Projetos', mensagens: 'Mensagens', clientes: 'Clientes', financeiro: 'Financeiro' }

  const C = { bg: '#0A0D0B', bg2: '#131A15', bg3: '#1A231C', border: '#1E2821', border2: '#2B382F', text1: '#EEF3EE', text2: '#9CAC9F', text3: '#5D6C60', accent: '#E2C078' }

  return (
    <div style={{ minHeight: '100vh', background: C.bg, fontFamily: 'DM Sans, sans-serif', color: C.text1 }}>
      {/* Topbar */}
      <div style={{ background: C.bg2, borderBottom: `1px solid ${C.border}`, padding: '0 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 52 }}>
        <div style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: 16, fontWeight: 700 }}>
          Flow<span style={{ color: C.accent }}>CRM</span>
          <span style={{ fontSize: 10, color: C.text3, marginLeft: 8, fontFamily: 'DM Sans, sans-serif', fontWeight: 400 }}>Portal</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* Aviso de trial */}
          {trialAlerta !== null && trialAlerta <= 3 && (
            <div style={{ fontSize: 11, background: trialAlerta <= 1 ? 'rgba(232,100,91,0.12)' : 'rgba(239,180,84,0.12)', border: `1px solid ${trialAlerta <= 1 ? 'rgba(232,100,91,0.3)' : 'rgba(239,180,84,0.3)'}`, borderRadius: 6, padding: '4px 10px', color: trialAlerta <= 1 ? '#E8645B' : '#EFB454' }}>
              ⚠️ Trial expira em {trialAlerta <= 0 ? 'hoje' : `${trialAlerta} dia${trialAlerta > 1 ? 's' : ''}`}
            </div>
          )}
          <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'linear-gradient(135deg,#E2C078,#D98E4A)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: '#181208' }}>
            {perfil.dados.nome?.split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase()}
          </div>
          <span style={{ fontSize: 12, color: C.text2 }}>{perfil.dados.nome || perfil.dados.nome_completo}</span>
          <button onClick={() => { setLogado(false); setPerfil(null) }} style={{ background: 'none', border: 'none', color: C.text3, cursor: 'pointer', fontSize: 12 }}>Sair</button>
        </div>
      </div>

      {/* Nav */}
      <div style={{ background: C.bg2, borderBottom: `1px solid ${C.border}`, padding: '0 20px', display: 'flex', gap: 4 }}>
        {navItems.map(n => (
          <button key={n} onClick={() => setPview(n)}
            style={{ background: 'none', border: 'none', borderBottom: pview === n ? `2px solid ${C.accent}` : '2px solid transparent', padding: '10px 14px', fontSize: 12, color: pview === n ? C.accent : C.text3, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', marginBottom: -1 }}>
            {navLabel[n]}
          </button>
        ))}
      </div>

      {/* Conteúdo */}
      <div style={{ padding: 24, maxWidth: 1200, margin: '0 auto' }}>

        {/* Mini-CRM (leads do cliente) */}
        {pview === 'crm' && isCliente && <MiniCRM clienteId={perfil.dados.id} />}

        {/* Projetos */}
        {pview === 'projetos' && (
          <div>
            <div style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: 18, fontWeight: 700, marginBottom: 16 }}>
              {isCliente ? 'Meus Projetos' : 'Projetos'}
            </div>
            {projetos.length === 0 && <div style={{ fontSize: 12, color: C.text3 }}>Nenhum projeto ainda.</div>}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 12 }}>
              {projetos.map(p => (
                <div key={p.id} style={{ background: C.bg2, border: `1px solid ${C.border}`, borderRadius: 10, padding: 16 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>{p.nome}</div>
                  {p.clientes && <div style={{ fontSize: 11, color: C.text3, marginBottom: 8 }}>{p.clientes.nome}</div>}
                  <div style={{ height: 4, background: C.bg3, borderRadius: 2, marginBottom: 6 }}>
                    <div style={{ height: '100%', width: `${p.progresso || 0}%`, background: 'linear-gradient(90deg,#E2C078,#3DCE8C)', borderRadius: 2, transition: 'width 0.4s' }} />
                  </div>
                  <div style={{ fontSize: 11, color: C.text3 }}>{p.progresso || 0}% concluído</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Mensagens */}
        {pview === 'mensagens' && isCliente && (
          <div>
            <div style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: 18, fontWeight: 700, marginBottom: 16 }}>Mensagens</div>
            <div style={{ background: C.bg2, border: `1px solid ${C.border}`, borderRadius: 10, padding: 16, maxHeight: 420, overflowY: 'auto', marginBottom: 12 }}>
              {msgs.length === 0 && <div style={{ fontSize: 12, color: C.text3 }}>Nenhuma mensagem ainda.</div>}
              {msgs.map((m, i) => (
                <div key={i} style={{ marginBottom: 12, display: 'flex', flexDirection: m.remetente === 'cliente' ? 'row-reverse' : 'row', gap: 8 }}>
                  <div style={{ maxWidth: '75%', background: m.remetente === 'cliente' ? 'rgba(226,192,120,0.12)' : C.bg3, border: `1px solid ${m.remetente === 'cliente' ? 'rgba(226,192,120,0.2)' : C.border2}`, borderRadius: 10, padding: '8px 12px' }}>
                    <div style={{ fontSize: 10, color: C.accent, marginBottom: 3, fontWeight: 600 }}>{m.nome_remetente}</div>
                    <div style={{ fontSize: 12, color: C.text1 }}>{m.texto}</div>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <input value={novaMsg} onChange={e => setNovaMsg(e.target.value)} onKeyDown={e => e.key === 'Enter' && enviarMsg()} placeholder="Escreva uma mensagem..."
                style={{ flex: 1, background: C.bg2, border: `1px solid ${C.border2}`, borderRadius: 8, padding: '9px 14px', color: C.text1, fontSize: 12, outline: 'none' }} />
              <button onClick={enviarMsg} style={{ background: 'linear-gradient(135deg,#E2C078,#D98E4A)', border: 'none', borderRadius: 8, padding: '9px 16px', fontSize: 12, fontWeight: 600, color: '#181208', cursor: 'pointer' }}>Enviar</button>
            </div>
          </div>
        )}

        {/* Clientes (colaborador) */}
        {pview === 'clientes' && !isCliente && (
          <div>
            <div style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: 18, fontWeight: 700, marginBottom: 16 }}>Clientes da Agência</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(240px,1fr))', gap: 10 }}>
              {clientes.map(c => (
                <div key={c.id} style={{ background: C.bg2, border: `1px solid ${C.border}`, borderRadius: 10, padding: 14, display: 'flex', gap: 10, alignItems: 'center' }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: c.cor || '#4F7CFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#fff', flexShrink: 0 }}>{c.iniciais}</div>
                  <div><div style={{ fontSize: 12, fontWeight: 500 }}>{c.nome}</div><div style={{ fontSize: 10, color: C.text3 }}>{c.segmento || c.status}</div></div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
