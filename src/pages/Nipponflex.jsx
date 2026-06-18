import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase.js'
import { EsqueceuSenha, RedefinirSenha } from '../lib/passwordReset.jsx'

// ── Paleta Nipponflex ─────────────────────────────────────
const NF = {
  bg0: '#05080A',
  bg1: '#0A0F12',
  bg2: '#0F1A20',
  bg3: '#162330',
  border: '#1A2D3A',
  border2: '#1F3545',
  text1: '#E8F4F8',
  text2: '#7FA8BC',
  text3: '#3D6478',
  accent: '#00B4D8',   // azul água
  accent2: '#0077A8',
  green: '#00C896',
  amber: '#F4A23A',
  red: '#E85A4F',
  grad: 'linear-gradient(135deg, #00B4D8, #0077A8)',
}

const inp = {
  width: '100%', background: NF.bg3, border: `1px solid ${NF.border2}`,
  borderRadius: 7, padding: '9px 12px', color: NF.text1,
  fontSize: 12, outline: 'none', fontFamily: 'DM Sans, sans-serif',
  boxSizing: 'border-box',
}
const lbl = { fontSize: 10, color: NF.text3, display: 'block', marginBottom: 4, letterSpacing: '0.8px', textTransform: 'uppercase', fontWeight: 600 }

// ── Tela de Login ─────────────────────────────────────────
function LoginScreen({ onLogin }) {
  const [aba, setAba] = useState('login') // login | cadastro
  const [tela, setTela] = useState(() => new URLSearchParams(window.location.search).has('reset') ? 'reset' : 'login')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [nome, setNome] = useState('')
  const [cidade, setCidade] = useState('')
  const [confirmar, setConfirmar] = useState('')
  const [erro, setErro] = useState('')
  const [sucesso, setSucesso] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogin(e) {
    e.preventDefault()
    setErro('')
    setLoading(true)
    const { data, error } = await supabase
      .from('nipponflex_distribuidores')
      .select('*')
      .ilike('email', email.trim().toLowerCase())
      .eq('ativo', true)
      .single()
    setLoading(false)
    if (error || !data) { setErro('E-mail não encontrado ou acesso inativo.'); return }
    if (data.senha !== senha) { setErro('Senha incorreta.'); return }
    onLogin(data)
  }

  async function handleCadastro(e) {
    e.preventDefault()
    setErro('')
    if (senha !== confirmar) { setErro('As senhas não coincidem.'); return }
    if (senha.length < 6) { setErro('A senha deve ter pelo menos 6 caracteres.'); return }
    setLoading(true)

    // Verifica se e-mail já existe
    const { data: existe } = await supabase
      .from('nipponflex_distribuidores')
      .select('id')
      .ilike('email', email.trim().toLowerCase())
      .single()

    if (existe) {
      setLoading(false)
      setErro('Este e-mail já está cadastrado. Faça login.')
      return
    }

    const { error } = await supabase.from('nipponflex_distribuidores').insert({
      nome: nome.trim(),
      email: email.trim().toLowerCase(),
      senha,
      cidade: cidade.trim(),
      ativo: true,
    })
    setLoading(false)
    if (error) { setErro('Erro ao cadastrar. Tente novamente.'); return }
    setSucesso('Cadastro realizado com sucesso! Faça login para continuar.')
    setAba('login')
    setNome(''); setCidade(''); setConfirmar('')
  }

  const Logo = () => (
    <div style={{ textAlign: 'center', marginBottom: 28 }}>
      <div style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: 24, fontWeight: 800, letterSpacing: '-0.02em', marginBottom: 4 }}>
        <span style={{ color: NF.accent }}>Nipponflex</span>
        <span style={{ color: NF.text1 }}> CRM</span>
      </div>
      <div style={{ fontSize: 11, color: NF.text3, letterSpacing: '1px', textTransform: 'uppercase' }}>Portal do Distribuidor</div>
    </div>
  )

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: NF.bg0, fontFamily: 'DM Sans, sans-serif', padding: 16 }}>
      <div style={{ position: 'fixed', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
        <div style={{ position: 'absolute', top: '15%', left: '50%', transform: 'translateX(-50%)', width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle, rgba(0,180,216,0.06) 0%, transparent 70%)' }} />
      </div>

      <div style={{ background: NF.bg2, border: `1px solid ${NF.border2}`, borderRadius: 16, padding: '32px 28px', width: '100%', maxWidth: 360, position: 'relative', zIndex: 1, boxShadow: '0 20px 60px rgba(0,0,0,0.5)' }}>
        <Logo />

        {/* Abas */}
        <div style={{ display: 'flex', background: NF.bg3, borderRadius: 8, padding: 3, marginBottom: 24, gap: 3 }}>
          {[['login','Entrar'],['cadastro','Cadastrar']].map(([id, label]) => (
            <button key={id} onClick={() => { setAba(id); setErro('') }}
              style={{ flex: 1, background: aba === id ? NF.bg2 : 'transparent', border: 'none', borderRadius: 6, padding: '7px 0', fontSize: 12, fontWeight: 600, color: aba === id ? NF.accent : NF.text3, cursor: 'pointer', transition: 'all 0.15s', boxShadow: aba === id ? '0 1px 4px rgba(0,0,0,0.3)' : 'none' }}>
              {label}
            </button>
          ))}
        </div>

        {sucesso && (
          <div style={{ fontSize: 12, color: NF.green, marginBottom: 16, background: 'rgba(0,200,150,0.08)', border: `1px solid rgba(0,200,150,0.2)`, borderRadius: 6, padding: '10px 12px', lineHeight: 1.5 }}>
            ✓ {sucesso}
          </div>
        )}

        {/* RESET / ESQUECEU SENHA */}
        {tela === 'reset' && <RedefinirSenha tabela="nipponflex_distribuidores" tema="blue" onConcluido={() => setTela('login')} />}
        {tela === 'esqueceu' && <EsqueceuSenha tabela="nipponflex_distribuidores" tema="blue" onVoltar={() => setTela('login')} />}

        {/* LOGIN */}
        {tela === 'login' && aba === 'login' && (
          <form onSubmit={handleLogin}>
            <div style={{ marginBottom: 12 }}>
              <label style={lbl}>E-mail</label>
              <input value={email} onChange={e => setEmail(e.target.value)} type="email" required placeholder="seu@email.com" style={inp} autoFocus />
            </div>
            <div style={{ marginBottom: 8 }}>
              <label style={lbl}>Senha</label>
              <input value={senha} onChange={e => setSenha(e.target.value)} type="password" required placeholder="••••••••" style={inp} />
            </div>
            <div style={{ textAlign: 'right', marginBottom: 16 }}>
              <button type="button" onClick={() => setTela('esqueceu')}
                style={{ background: 'none', border: 'none', color: NF.accent, cursor: 'pointer', fontSize: 11, padding: 0 }}>
                Esqueceu a senha?
              </button>
            </div>
            {erro && <div style={{ fontSize: 11, color: NF.red, marginBottom: 14, background: 'rgba(232,90,79,0.08)', border: `1px solid rgba(232,90,79,0.2)`, borderRadius: 6, padding: '8px 12px' }}>{erro}</div>}
            <button type="submit" disabled={loading}
              style={{ width: '100%', background: NF.grad, border: 'none', borderRadius: 8, padding: 11, fontSize: 13, fontWeight: 700, color: '#fff', cursor: 'pointer', opacity: loading ? 0.7 : 1 }}>
              {loading ? 'Entrando...' : 'Acessar sistema'}
            </button>
            <div style={{ textAlign: 'center', marginTop: 14, fontSize: 12, color: NF.text3 }}>
              Ainda não tem conta?{' '}
              <button type="button" onClick={() => { setAba('cadastro'); setErro('') }}
                style={{ background: 'none', border: 'none', color: NF.accent, cursor: 'pointer', fontSize: 12, fontWeight: 600, padding: 0 }}>
                Cadastre-se grátis
              </button>
            </div>
          </form>
        )}

        {/* CADASTRO */}
        {aba === 'cadastro' && (
          <form onSubmit={handleCadastro}>
            <div style={{ marginBottom: 12 }}>
              <label style={lbl}>Seu nome *</label>
              <input value={nome} onChange={e => setNome(e.target.value)} required placeholder="Nome completo" style={inp} autoFocus />
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={lbl}>Cidade</label>
              <input value={cidade} onChange={e => setCidade(e.target.value)} placeholder="Sua cidade" style={inp} />
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={lbl}>E-mail *</label>
              <input value={email} onChange={e => setEmail(e.target.value)} type="email" required placeholder="seu@email.com" style={inp} />
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={lbl}>Senha *</label>
              <input value={senha} onChange={e => setSenha(e.target.value)} type="password" required placeholder="Mínimo 6 caracteres" style={inp} />
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={lbl}>Confirmar senha *</label>
              <input value={confirmar} onChange={e => setConfirmar(e.target.value)} type="password" required placeholder="Repita a senha" style={inp} />
            </div>
            {erro && <div style={{ fontSize: 11, color: NF.red, marginBottom: 14, background: 'rgba(232,90,79,0.08)', border: `1px solid rgba(232,90,79,0.2)`, borderRadius: 6, padding: '8px 12px' }}>{erro}</div>}
            <button type="submit" disabled={loading}
              style={{ width: '100%', background: NF.grad, border: 'none', borderRadius: 8, padding: 11, fontSize: 13, fontWeight: 700, color: '#fff', cursor: 'pointer', opacity: loading ? 0.7 : 1 }}>
              {loading ? 'Cadastrando...' : 'Criar minha conta'}
            </button>
            <div style={{ textAlign: 'center', marginTop: 14, fontSize: 12, color: NF.text3 }}>
              Já tem conta?{' '}
              <button type="button" onClick={() => { setAba('login'); setErro('') }}
                style={{ background: 'none', border: 'none', color: NF.accent, cursor: 'pointer', fontSize: 12, fontWeight: 600, padding: 0 }}>
                Fazer login
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}


// ── Card de cliente ───────────────────────────────────────
function ClienteCard({ c, onDelete, onEdit }) {
  const hoje = new Date()
  const troca = c.data_troca_refil ? new Date(c.data_troca_refil + 'T12:00:00') : null
  const diasParaTroca = troca ? Math.ceil((troca - hoje) / (1000 * 60 * 60 * 24)) : null
  const alertaTroca = diasParaTroca !== null && diasParaTroca <= 7

  return (
    <div style={{ background: NF.bg2, border: `1px solid ${alertaTroca ? NF.amber : NF.border}`, borderRadius: 10, padding: 14, transition: 'border-color 0.15s, transform 0.15s, box-shadow 0.15s' }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.4)' }}
      onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none' }}>

      {alertaTroca && (
        <div style={{ fontSize: 10, color: NF.amber, background: 'rgba(244,162,58,0.1)', border: '1px solid rgba(244,162,58,0.25)', borderRadius: 5, padding: '4px 8px', marginBottom: 10, fontWeight: 600 }}>
          ⚠️ Troca de refil em {diasParaTroca <= 0 ? 'hoje/vencido' : `${diasParaTroca} dia${diasParaTroca > 1 ? 's' : ''}`}
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: NF.text1, marginBottom: 2 }}>{c.nome}</div>
          <div style={{ fontSize: 11, color: NF.text3 }}>{c.produto || '—'}</div>
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          <button onClick={() => onEdit(c)} style={{ background: 'none', border: `1px solid ${NF.border2}`, borderRadius: 5, padding: '3px 8px', fontSize: 10, color: NF.text2, cursor: 'pointer' }}>✏️</button>
          <button onClick={() => onDelete(c.id)} style={{ background: 'none', border: 'none', color: NF.text3, cursor: 'pointer', fontSize: 12 }}>✕</button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 10 }}>
        {[
          ['📅 Compra', c.data_compra ? new Date(c.data_compra + 'T12:00:00').toLocaleDateString('pt-BR') : '—'],
          ['🔄 Refil', c.data_troca_refil ? new Date(c.data_troca_refil + 'T12:00:00').toLocaleDateString('pt-BR') : '—'],
          ['📍 Cidade', c.cidade || '—'],
          ['🏘️ Bairro', c.bairro || '—'],
        ].map(([k, v]) => (
          <div key={k} style={{ background: NF.bg3, borderRadius: 6, padding: '6px 8px' }}>
            <div style={{ fontSize: 9, color: NF.text3, marginBottom: 2 }}>{k}</div>
            <div style={{ fontSize: 11, color: NF.text2, fontWeight: 500 }}>{v}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        {c.whatsapp ? (
          <a href={`https://wa.me/55${c.whatsapp.replace(/\D/g,'')}`} target="_blank" rel="noreferrer"
            style={{ fontSize: 11, color: NF.green, textDecoration: 'none', fontWeight: 600 }}>
            💬 {c.whatsapp}
          </a>
        ) : <span style={{ fontSize: 11, color: NF.text3 }}>Sem WhatsApp</span>}

        <span style={{ fontSize: 10, padding: '3px 8px', borderRadius: 99, fontWeight: 600, background: c.entrou_equipe ? 'rgba(0,200,150,0.12)' : 'rgba(61,100,120,0.15)', color: c.entrou_equipe ? NF.green : NF.text3 }}>
          {c.entrou_equipe ? '✓ Na equipe' : 'Não entrou'}
        </span>
      </div>

      {c.anotacoes && (
        <div style={{ marginTop: 8, fontSize: 11, color: NF.text3, background: NF.bg3, borderRadius: 6, padding: '6px 10px', lineHeight: 1.5 }}>
          📝 {c.anotacoes}
        </div>
      )}
    </div>
  )
}

// ── Modal de cadastro/edição ──────────────────────────────
function ModalCliente({ cliente, distribuidorId, onSave, onClose }) {
  const [form, setForm] = useState(cliente ? { ...cliente } : {
    nome: '', produto: '', data_compra: '', data_troca_refil: '',
    cidade: '', bairro: '', whatsapp: '', entrou_equipe: false, anotacoes: ''
  })
  const [saving, setSaving] = useState(false)

  async function salvar() {
    if (!form.nome) return
    setSaving(true)
    const dados = { ...form, distribuidor_id: distribuidorId, atualizado_em: new Date().toISOString() }
    if (cliente) {
      await supabase.from('nipponflex_clientes').update(dados).eq('id', cliente.id)
    } else {
      await supabase.from('nipponflex_clientes').insert(dados)
    }
    setSaving(false)
    onSave()
  }

  const F = (label, field, type = 'text', opts = {}) => (
    <div style={opts.full ? { gridColumn: '1/-1' } : {}}>
      <label style={lbl}>{label}</label>
      {type === 'checkbox' ? (
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 12, color: NF.text2 }}>
          <input type="checkbox" checked={!!form[field]} onChange={e => setForm({...form, [field]: e.target.checked})}
            style={{ width: 16, height: 16, accentColor: NF.accent }} />
          Sim, entrou na equipe Nipponflex
        </label>
      ) : type === 'textarea' ? (
        <textarea style={{ ...inp, resize: 'vertical' }} rows={3} value={form[field] || ''} onChange={e => setForm({...form, [field]: e.target.value})} placeholder={opts.placeholder || ''} />
      ) : (
        <input style={inp} type={type} value={form[field] || ''} onChange={e => setForm({...form, [field]: e.target.value})} placeholder={opts.placeholder || ''} />
      )}
    </div>
  )

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, fontFamily: 'DM Sans, sans-serif' }}
      onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={{ background: NF.bg2, border: `1px solid ${NF.border2}`, borderRadius: 14, padding: 24, width: 'min(480px, 95vw)', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.6)' }}>
        <div style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: 16, fontWeight: 700, color: NF.text1, marginBottom: 20 }}>
          {cliente ? 'Editar cliente' : 'Novo cliente'}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
          {F('Nome *', 'nome', 'text', { full: true, placeholder: 'Nome completo do cliente' })}
          {F('Produto', 'produto', 'text', { placeholder: 'Ex: Nipponflex Plus' })}
          {F('Data de compra', 'data_compra', 'date')}
          {F('Data troca do refil', 'data_troca_refil', 'date')}
          {F('Cidade', 'cidade', 'text', { placeholder: 'Cidade' })}
          {F('Bairro', 'bairro', 'text', { placeholder: 'Bairro' })}
          {F('WhatsApp', 'whatsapp', 'text', { full: true, placeholder: '(81) 99999-9999' })}
          {F('Entrou na equipe?', 'entrou_equipe', 'checkbox', { full: true })}
          {F('Anotações', 'anotacoes', 'textarea', { full: true, placeholder: 'Observações gerais...' })}
        </div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ background: 'none', border: `1px solid ${NF.border2}`, borderRadius: 7, padding: '8px 16px', fontSize: 12, color: NF.text2, cursor: 'pointer' }}>Cancelar</button>
          <button onClick={salvar} disabled={!form.nome || saving}
            style={{ background: NF.grad, border: 'none', borderRadius: 7, padding: '8px 16px', fontSize: 12, fontWeight: 700, color: '#fff', cursor: 'pointer', opacity: !form.nome || saving ? 0.6 : 1 }}>
            {saving ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── PORTAL PRINCIPAL ──────────────────────────────────────
export default function Nipponflex() {
  const [distribuidor, setDistribuidor] = useState(null)
  const [clientes, setClientes] = useState([])
  const [loading, setLoading] = useState(false)
  const [modal, setModal] = useState(false)
  const [editando, setEditando] = useState(null)
  const [busca, setBusca] = useState('')
  const [filtro, setFiltro] = useState('todos') // todos | equipe | refil
  const [stats, setStats] = useState({ total: 0, equipe: 0, refil: 0 })

  async function loadClientes(dist) {
    setLoading(true)
    const { data } = await supabase
      .from('nipponflex_clientes')
      .select('*')
      .eq('distribuidor_id', dist.id)
      .order('nome')
    const lista = data || []
    setClientes(lista)

    const hoje = new Date()
    const refil7 = lista.filter(c => {
      if (!c.data_troca_refil) return false
      const d = new Date(c.data_troca_refil + 'T12:00:00')
      return Math.ceil((d - hoje) / (1000 * 60 * 60 * 24)) <= 7
    }).length

    setStats({ total: lista.length, equipe: lista.filter(c => c.entrou_equipe).length, refil: refil7 })
    setLoading(false)
  }

  function onLogin(dist) {
    setDistribuidor(dist)
    loadClientes(dist)
  }

  async function deletar(id) {
    if (!confirm('Excluir este cliente? Os dados serão perdidos.')) return
    await supabase.from('nipponflex_clientes').delete().eq('id', id)
    await loadClientes(distribuidor)
  }

  const filtrados = clientes.filter(c => {
    const matchBusca = !busca || c.nome?.toLowerCase().includes(busca.toLowerCase()) || c.cidade?.toLowerCase().includes(busca.toLowerCase()) || c.bairro?.toLowerCase().includes(busca.toLowerCase())
    const hoje = new Date()
    if (filtro === 'equipe') return matchBusca && c.entrou_equipe
    if (filtro === 'refil') {
      if (!c.data_troca_refil) return false
      const d = new Date(c.data_troca_refil + 'T12:00:00')
      return matchBusca && Math.ceil((d - hoje) / (1000 * 60 * 60 * 24)) <= 7
    }
    return matchBusca
  })

  if (!distribuidor) return <LoginScreen onLogin={onLogin} />

  return (
    <div style={{ minHeight: '100vh', background: NF.bg0, fontFamily: 'DM Sans, sans-serif', color: NF.text1 }}>
      {/* Topbar */}
      <div style={{ background: NF.bg1, borderBottom: `1px solid ${NF.border}`, padding: '0 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 54, position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: 17, fontWeight: 800, letterSpacing: '-0.01em' }}>
            <span style={{ color: NF.accent }}>Nipponflex</span>
            <span style={{ color: NF.text1 }}> CRM</span>
          </div>
          <div style={{ width: 1, height: 18, background: NF.border }} />
          <div style={{ fontSize: 12, color: NF.text3 }}>{distribuidor.nome}</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button onClick={() => { setEditando(null); setModal(true) }}
            style={{ background: NF.grad, border: 'none', borderRadius: 8, padding: '7px 16px', fontSize: 12, fontWeight: 700, color: '#fff', cursor: 'pointer' }}>
            + Novo cliente
          </button>
          <button onClick={() => setDistribuidor(null)} style={{ background: 'none', border: 'none', color: NF.text3, cursor: 'pointer', fontSize: 12 }}>Sair</button>
        </div>
      </div>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '24px 20px' }}>

        {/* Métricas */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 20 }}>
          {[
            { label: 'Total de clientes', value: stats.total, cor: NF.accent, icon: '👥' },
            { label: 'Na equipe', value: stats.equipe, cor: NF.green, icon: '⭐' },
            { label: 'Refil em 7 dias', value: stats.refil, cor: NF.amber, icon: '🔄' },
          ].map((m, i) => (
            <div key={i} style={{ background: NF.bg2, border: `1px solid ${i === 2 && stats.refil > 0 ? NF.amber : NF.border}`, borderRadius: 10, padding: '14px 16px', borderTop: `2px solid ${m.cor}` }}>
              <div style={{ fontSize: 20, marginBottom: 6 }}>{m.icon}</div>
              <div style={{ fontSize: 10, color: NF.text3, fontWeight: 600, letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: 4 }}>{m.label}</div>
              <div style={{ fontSize: 28, fontWeight: 800, color: m.cor, fontFamily: 'Space Grotesk, sans-serif' }}>{m.value}</div>
            </div>
          ))}
        </div>

        {/* Filtros e busca */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 18, flexWrap: 'wrap' }}>
          <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar por nome, cidade ou bairro..."
            style={{ ...inp, flex: 1, minWidth: 220, padding: '8px 12px' }} />
          {[
            { id: 'todos', label: `Todos (${clientes.length})` },
            { id: 'equipe', label: `Na equipe (${stats.equipe})` },
            { id: 'refil', label: `Refil próximo (${stats.refil})` },
          ].map(f => (
            <button key={f.id} onClick={() => setFiltro(f.id)}
              style={{ background: filtro === f.id ? NF.grad : 'transparent', border: `1px solid ${filtro === f.id ? 'transparent' : NF.border2}`, borderRadius: 7, padding: '7px 14px', fontSize: 11, fontWeight: 600, color: filtro === f.id ? '#fff' : NF.text3, cursor: 'pointer', transition: 'all 0.15s' }}>
              {f.label}
            </button>
          ))}
        </div>

        {/* Grid de clientes */}
        {loading && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
            {[1,2,3].map(i => <div key={i} style={{ height: 180, background: NF.bg2, borderRadius: 10, animation: 'pulse 1.5s ease infinite' }} />)}
          </div>
        )}

        {!loading && filtrados.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>📋</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: NF.text1, marginBottom: 6 }}>
              {clientes.length === 0 ? 'Nenhum cliente cadastrado ainda' : 'Nenhum resultado encontrado'}
            </div>
            <div style={{ fontSize: 12, color: NF.text3, marginBottom: 20 }}>
              {clientes.length === 0 ? 'Cadastre seus clientes para começar a acompanhar' : 'Tente outro termo de busca'}
            </div>
            {clientes.length === 0 && (
              <button onClick={() => { setEditando(null); setModal(true) }}
                style={{ background: NF.grad, border: 'none', borderRadius: 8, padding: '10px 20px', fontSize: 13, fontWeight: 700, color: '#fff', cursor: 'pointer' }}>
                + Cadastrar primeiro cliente
              </button>
            )}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
          {filtrados.map(c => (
            <ClienteCard key={c.id} c={c}
              onDelete={deletar}
              onEdit={(c) => { setEditando(c); setModal(true) }} />
          ))}
        </div>
      </div>

      {modal && (
        <ModalCliente
          cliente={editando}
          distribuidorId={distribuidor.id}
          onSave={() => { setModal(false); setEditando(null); loadClientes(distribuidor) }}
          onClose={() => { setModal(false); setEditando(null) }}
        />
      )}

      <style>{`
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }
        * { box-sizing: border-box; }
      `}</style>
    </div>
  )
}
