import React, { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase.js'

const ABAS = [
  { id:'visao',         label:'Visão Geral',    icon:'📊' },
  { id:'colaboradores', label:'Colaboradores',  icon:'👥' },
  { id:'metas',         label:'Metas',          icon:'🎯' },
  { id:'acompanhamento',label:'Acompanhamento', icon:'📈' },
  { id:'auditoria',     label:'Auditoria',      icon:'🔍' },
]
const TIPOS_META = ['Comercial','Operacional','Financeiro','Marketing','Outro']
const TIPO_META_COR = {
  'Comercial':'var(--accent)', 'Operacional':'var(--amber)',
  'Financeiro':'var(--green)', 'Marketing':'var(--accent2)', 'Outro':'var(--text3)',
}
const fmt = v => `R$ ${Number(v||0).toLocaleString('pt-BR',{minimumFractionDigits:2})}`

export default function Gestao() {
  const [aba, setAba]               = useState('visao')
  const [colaboradores, setColabs]  = useState([])
  const [metas, setMetas]           = useState([])
  const [alertas, setAlertas]       = useState([])
  const [clientes, setClientes]     = useState([])
  const [projetos, setProjetos]     = useState([])
  const [loading, setLoading]       = useState(true)
  const [saving, setSaving]         = useState(false)

  // Modais
  const [modalColab, setModalColab]     = useState(false)
  const [modalMeta, setModalMeta]       = useState(false)
  const [modalAlerta, setModalAlerta]   = useState(false)
  const [modalAcesso, setModalAcesso]   = useState(null) // colaborador para gerenciar acesso
  const [colabProjSel, setColabProjSel] = useState([]) // ids de projetos selecionados
  const [colabVinculados, setColabVinc] = useState([]) // projetos já vinculados

  // Forms
  const [formColab, setFormColab]   = useState({ nome:'', email:'', cargo:'' })
  const [formMeta, setFormMeta]     = useState({ titulo:'', descricao:'', tipo:'Comercial', valor_meta:'', valor_atual:'0', unidade:'R$', data_fim:'', colaborador_id:'' })
  const [formAlerta, setFormAlerta] = useState({ titulo:'', tipo:'aviso', descricao:'', colaborador_id:'', cliente_id:'' })
  const [portalEmail, setPortalEmail] = useState('')

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    setLoading(true)
    const [{ data: c }, { data: m }, { data: a }, { data: cl }, { data: p }] = await Promise.all([
      supabase.from('colaboradores').select('*').eq('ativo', true).order('criado_em'),
      supabase.from('metas').select('*, colaboradores(nome, avatar_iniciais, avatar_cor)').order('criado_em', { ascending: false }),
      supabase.from('alertas').select('*, colaboradores(nome), clientes(nome)').order('criado_em', { ascending: false }),
      supabase.from('clientes').select('id, nome').order('nome'),
      supabase.from('projetos').select('id, nome, servico, etapa, clientes(nome)').order('nome'),
    ])
    setColabs(c || [])
    setMetas(m || [])
    setAlertas(a || [])
    setClientes(cl || [])
    setProjetos(p || [])
    setLoading(false)
  }

  // ── Colaboradores ────────────────────────────────────────────────
  async function salvarColab() {
    setSaving(true)
    const iniciais = formColab.nome.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase()
    const cores = ['#4F7CFF','#7B5CFF','#22C97A','#F5A623','#FF5B5B']
    await supabase.from('colaboradores').insert({ ...formColab, avatar_iniciais: iniciais, avatar_cor: cores[colaboradores.length % cores.length] })
    setModalColab(false)
    setFormColab({ nome:'', email:'', cargo:'' })
    await loadAll()
    setSaving(false)
  }

  async function deletarColab(id) {
    if (!confirm('Remover colaborador?')) return
    await supabase.from('colaboradores').update({ ativo: false }).eq('id', id)
    await loadAll()
  }

  // ── Acesso ao Portal ─────────────────────────────────────────────
  async function abrirModalAcesso(colab) {
    setModalAcesso(colab)
    setPortalEmail(colab.portal_email || '')
    // Buscar projetos já vinculados
    const { data: cp } = await supabase
      .from('colaborador_projetos')
      .select('projeto_id')
      .eq('colaborador_id', colab.id)
    const ids = (cp || []).map(x => x.projeto_id)
    setColabVinc(ids)
    setColabProjSel(ids)
  }

  async function salvarAcesso() {
    setSaving(true)
    // Atualizar email do portal
    await supabase.from('colaboradores')
      .update({ portal_email: portalEmail || null })
      .eq('id', modalAcesso.id)

    // Remover vínculos antigos
    await supabase.from('colaborador_projetos')
      .delete().eq('colaborador_id', modalAcesso.id)

    // Inserir novos vínculos
    if (colabProjSel.length > 0) {
      const rows = colabProjSel.map(projeto_id => ({
        colaborador_id: modalAcesso.id,
        projeto_id,
      }))
      await supabase.from('colaborador_projetos').insert(rows)
    }

    setModalAcesso(null)
    await loadAll()
    setSaving(false)
  }

  function toggleProjeto(id) {
    setColabProjSel(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }

  // ── Metas ────────────────────────────────────────────────────────
  async function salvarMeta() {
    setSaving(true)
    await supabase.from('metas').insert({
      ...formMeta,
      valor_meta: parseFloat(formMeta.valor_meta)||0,
      valor_atual: parseFloat(formMeta.valor_atual)||0,
      colaborador_id: formMeta.colaborador_id||null,
      data_fim: formMeta.data_fim||null,
    })
    setModalMeta(false)
    setFormMeta({ titulo:'', descricao:'', tipo:'Comercial', valor_meta:'', valor_atual:'0', unidade:'R$', data_fim:'', colaborador_id:'' })
    await loadAll()
    setSaving(false)
  }

  async function atualizarMeta(id, valor_atual) {
    await supabase.from('metas').update({ valor_atual: parseFloat(valor_atual)||0 }).eq('id', id)
    await loadAll()
  }

  // ── Alertas ──────────────────────────────────────────────────────
  async function salvarAlerta() {
    setSaving(true)
    await supabase.from('alertas').insert({
      ...formAlerta,
      colaborador_id: formAlerta.colaborador_id||null,
      cliente_id: formAlerta.cliente_id||null,
    })
    setModalAlerta(false)
    setFormAlerta({ titulo:'', tipo:'aviso', descricao:'', colaborador_id:'', cliente_id:'' })
    await loadAll()
    setSaving(false)
  }

  async function resolverAlerta(id) {
    await supabase.from('alertas').update({ resolvido: true }).eq('id', id)
    await loadAll()
  }

  // ── Métricas ─────────────────────────────────────────────────────
  const metasAtivas     = metas.filter(m => m.status === 'ativa').length
  const alertasAbertos  = alertas.filter(a => !a.resolvido).length
  const alertasUrgentes = alertas.filter(a => !a.resolvido && a.tipo === 'urgente').length
  const problemasColab  = colaboradores.map(c => ({
    ...c,
    parados: alertas.filter(a => !a.resolvido && a.colaborador_id === c.id).length,
  })).filter(c => c.parados > 0)

  const inp = {
    width:'100%', background:'var(--bg3)', border:'1px solid var(--border2)',
    borderRadius:7, padding:'8px 12px', color:'var(--text1)',
    fontSize:12, outline:'none', fontFamily:'DM Sans, sans-serif',
  }
  const lbl = { fontSize:11, color:'var(--text3)', display:'block', marginBottom:4, letterSpacing:'0.3px' }

  return (
    <div>
      {/* Header */}
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:18 }}>
        <div style={{ display:'flex', alignItems:'center', gap:14 }}>
          <div style={{ width:44, height:44, borderRadius:10, background:'rgba(79,124,255,0.12)', border:'1px solid rgba(79,124,255,0.2)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:20 }}>🛡️</div>
          <div>
            <h1 style={{ fontFamily:'Syne, sans-serif', fontSize:20, fontWeight:700 }}>Central de Gestão</h1>
            <div style={{ fontSize:12, color:'var(--text3)', marginTop:2 }}>Gerencie equipe, metas e acompanhe a performance</div>
          </div>
        </div>
        <div style={{ display:'flex', gap:10 }}>
          <div style={{ background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:10, padding:'8px 16px', textAlign:'center', minWidth:80 }}>
            <div style={{ fontFamily:'Syne, sans-serif', fontSize:18, fontWeight:700, color:'var(--accent)' }}>{colaboradores.length}</div>
            <div style={{ fontSize:10, color:'var(--text3)', marginTop:1 }}>Colaboradores</div>
          </div>
          <div style={{ background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:10, padding:'8px 16px', textAlign:'center', minWidth:80 }}>
            <div style={{ fontFamily:'Syne, sans-serif', fontSize:18, fontWeight:700, color:'var(--amber)' }}>{metasAtivas}</div>
            <div style={{ fontSize:10, color:'var(--text3)', marginTop:1 }}>Metas Ativas</div>
          </div>
        </div>
      </div>

      {/* Abas */}
      <div style={{ display:'flex', gap:4, borderBottom:'1px solid var(--border)', marginBottom:20, overflowX:'auto' }}>
        {ABAS.map(a => (
          <button key={a.id} onClick={() => setAba(a.id)} style={{
            display:'flex', alignItems:'center', gap:6,
            padding:'8px 16px', borderRadius:'8px 8px 0 0', fontSize:12, fontWeight:500,
            cursor:'pointer', border:'none', fontFamily:'DM Sans, sans-serif',
            borderBottom: aba===a.id ? '2px solid var(--accent)' : '2px solid transparent',
            background: aba===a.id ? 'var(--bg2)' : 'none',
            color: aba===a.id ? 'var(--accent)' : 'var(--text3)',
            whiteSpace:'nowrap', transition:'all 0.15s',
          }}>
            <span>{a.icon}</span>{a.label}
          </button>
        ))}
      </div>

      {/* ═══ VISÃO GERAL ═══════════════════════════════════════════ */}
      {aba === 'visao' && (
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
          {/* Alertas de Projetos */}
          <div style={{ background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:12, padding:20 }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <span style={{ fontSize:16 }}>📋</span>
                <span style={{ fontFamily:'Syne, sans-serif', fontSize:14, fontWeight:600 }}>Alertas de Projetos</span>
              </div>
              <button onClick={loadAll} style={{ background:'var(--bg3)', border:'1px solid var(--border2)', borderRadius:6, padding:'5px 10px', fontSize:11, color:'var(--text2)', cursor:'pointer' }}>↻ Atualizar</button>
            </div>
            {alertasAbertos === 0 ? (
              <div style={{ textAlign:'center', padding:'30px 0' }}>
                <div style={{ fontSize:40, marginBottom:10 }}>✅</div>
                <div style={{ fontSize:13, fontWeight:500, color:'var(--text2)', marginBottom:4 }}>Nenhum alerta de projeto</div>
                <div style={{ fontSize:12, color:'var(--text3)' }}>Todas as tarefas estão em dia</div>
              </div>
            ) : (
              alertas.filter(a => !a.resolvido).slice(0,5).map(a => (
                <div key={a.id} style={{ display:'flex', alignItems:'flex-start', gap:10, padding:'8px 0', borderBottom:'1px solid var(--border)' }}>
                  <div style={{ fontSize:14, flexShrink:0 }}>{a.tipo==='urgente'?'🚨':a.tipo==='aviso'?'⚠️':a.tipo==='sucesso'?'✅':'ℹ️'}</div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:12, fontWeight:500, color:'var(--text1)' }}>{a.titulo}</div>
                    {a.descricao && <div style={{ fontSize:11, color:'var(--text3)', marginTop:1 }}>{a.descricao}</div>}
                    {a.clientes && <div style={{ fontSize:10, color:'var(--accent)', marginTop:2 }}>📌 {a.clientes.nome}</div>}
                  </div>
                  <button onClick={() => resolverAlerta(a.id)} style={{ fontSize:10, padding:'2px 8px', borderRadius:4, background:'rgba(34,201,122,0.1)', border:'1px solid rgba(34,201,122,0.2)', color:'var(--green)', cursor:'pointer', whiteSpace:'nowrap' }}>Resolver</button>
                </div>
              ))
            )}
            <button onClick={() => setModalAlerta(true)} style={{ width:'100%', marginTop:12, background:'none', border:'1px dashed var(--border2)', borderRadius:7, padding:'8px', fontSize:11, color:'var(--text3)', cursor:'pointer' }}>+ Novo alerta</button>
          </div>

          {/* Resumo Diário */}
          <div style={{ background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:12, padding:20 }}>
            <div style={{ fontFamily:'Syne, sans-serif', fontSize:14, fontWeight:600, marginBottom:4 }}>Resumo Diário</div>
            <div style={{ fontSize:11, color:'var(--text3)', marginBottom:16 }}>{new Date().toLocaleDateString('pt-BR', { weekday:'long', day:'numeric', month:'long' })}</div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:16 }}>
              {[
                { label:'Atrasadas', value: alertasUrgentes, cor:'var(--red)' },
                { label:'Pendentes', value: alertasAbertos, cor:'var(--amber)' },
                { label:'SLA Violado', value: 0, cor:'var(--text3)' },
                { label:'Notificações', value: alertasAbertos, cor:'var(--accent)' },
              ].map((m,i) => (
                <div key={i} style={{ background:'var(--bg3)', border:'1px solid var(--border)', borderRadius:8, padding:'10px 12px', textAlign:'center' }}>
                  <div style={{ fontFamily:'Syne, sans-serif', fontSize:20, fontWeight:700, color:m.cor }}>{m.value}</div>
                  <div style={{ fontSize:10, color:'var(--text3)', marginTop:2 }}>{m.label}</div>
                </div>
              ))}
            </div>
            <div style={{ fontFamily:'Syne, sans-serif', fontSize:12, fontWeight:600, marginBottom:8, display:'flex', alignItems:'center', gap:6 }}>
              ⚠️ Problemas por Colaborador
              {problemasColab.length > 0 && <span style={{ background:'var(--red)', color:'#fff', fontSize:10, borderRadius:'50%', width:18, height:18, display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700 }}>{problemasColab.length}</span>}
            </div>
            {problemasColab.length === 0
              ? <div style={{ fontSize:12, color:'var(--text3)', textAlign:'center', padding:'10px 0' }}>✅ Nenhum problema registrado</div>
              : problemasColab.map(c => (
                <div key={c.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 10px', background:'var(--bg3)', borderRadius:8, marginBottom:6 }}>
                  <div style={{ width:24, height:24, borderRadius:6, background:c.avatar_cor||'#4F7CFF', display:'flex', alignItems:'center', justifyContent:'center', fontSize:9, fontWeight:700, color:'#fff' }}>{c.avatar_iniciais}</div>
                  <span style={{ fontSize:12, color:'var(--text1)', flex:1 }}>{c.nome}</span>
                  <span style={{ fontSize:11, color:'var(--red)', background:'rgba(255,91,91,0.1)', padding:'2px 8px', borderRadius:10 }}>{c.parados} parados</span>
                </div>
              ))
            }
          </div>

          {/* Metas resumo */}
          <div style={{ background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:12, padding:20, gridColumn:'1/-1' }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <span style={{ fontSize:16 }}>🎯</span>
                <span style={{ fontFamily:'Syne, sans-serif', fontSize:14, fontWeight:600 }}>Metas Ativas</span>
              </div>
              <button onClick={() => setModalMeta(true)} style={{ background:'var(--accent)', border:'none', borderRadius:7, padding:'6px 12px', fontSize:11, fontWeight:500, color:'#fff', cursor:'pointer' }}>+ Nova Meta</button>
            </div>
            {metas.filter(m=>m.status==='ativa').length === 0
              ? <div style={{ textAlign:'center', padding:'20px 0', color:'var(--text3)', fontSize:12 }}>Nenhuma meta ativa.</div>
              : <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10 }}>
                  {metas.filter(m=>m.status==='ativa').map(m => {
                    const pct = m.valor_meta > 0 ? Math.min(Math.round((m.valor_atual/m.valor_meta)*100), 100) : 0
                    return (
                      <div key={m.id} style={{ background:'var(--bg3)', border:'1px solid var(--border2)', borderRadius:9, padding:14 }}>
                        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:6 }}>
                          <div style={{ fontSize:11, fontWeight:500, color:'var(--text1)' }}>{m.titulo}</div>
                          <span style={{ fontSize:10, padding:'1px 6px', borderRadius:4, background:`${TIPO_META_COR[m.tipo]}22`, color:TIPO_META_COR[m.tipo] }}>{m.tipo}</span>
                        </div>
                        <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:6 }}>
                          <div style={{ flex:1, height:5, background:'var(--bg4)', borderRadius:3, overflow:'hidden' }}>
                            <div style={{ height:'100%', width:`${pct}%`, background:pct>=100?'var(--green)':'var(--accent)', borderRadius:3 }}></div>
                          </div>
                          <span style={{ fontSize:11, fontWeight:600, color:pct>=100?'var(--green)':'var(--accent)', minWidth:32 }}>{pct}%</span>
                        </div>
                        <div style={{ fontSize:11, color:'var(--text3)' }}>
                          {m.unidade==='R$'?`${fmt(m.valor_atual)} / ${fmt(m.valor_meta)}`:`${m.valor_atual} / ${m.valor_meta} ${m.unidade}`}
                        </div>
                      </div>
                    )
                  })}
                </div>
            }
          </div>
        </div>
      )}

      {/* ═══ COLABORADORES ════════════════════════════════════════ */}
      {aba === 'colaboradores' && (
        <div>
          <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:14 }}>
            <button onClick={() => setModalColab(true)} style={{ background:'var(--accent)', border:'none', borderRadius:7, padding:'8px 16px', fontSize:12, fontWeight:500, color:'#fff', cursor:'pointer' }}>+ Novo Colaborador</button>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12 }}>
            {colaboradores.map(c => (
              <div key={c.id} style={{ background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:12, padding:18, textAlign:'center' }}>
                <div style={{ width:52, height:52, borderRadius:12, background:c.avatar_cor||'#4F7CFF', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, fontWeight:700, color:'#fff', margin:'0 auto 10px' }}>{c.avatar_iniciais}</div>
                <div style={{ fontFamily:'Syne, sans-serif', fontSize:14, fontWeight:600, color:'var(--text1)', marginBottom:3 }}>{c.nome}</div>
                <div style={{ fontSize:11, color:'var(--text3)', marginBottom:6 }}>{c.cargo || '—'}</div>
                {c.email && <div style={{ fontSize:11, color:'var(--accent)', marginBottom:4 }}>{c.email}</div>}

                {/* Status do portal */}
                <div style={{ margin:'8px 0', padding:'6px 10px', background:'var(--bg3)', borderRadius:7, fontSize:11 }}>
                  {c.portal_email
                    ? <span style={{ color:'var(--green)' }}>🔗 Portal: {c.portal_email}</span>
                    : <span style={{ color:'var(--text3)' }}>🔒 Sem acesso ao portal</span>
                  }
                </div>

                <div style={{ display:'flex', gap:6, justifyContent:'center', marginTop:8 }}>
                  {/* Botão gerenciar acesso */}
                  <button onClick={() => abrirModalAcesso(c)}
                    style={{ fontSize:11, padding:'5px 10px', borderRadius:6, background:'rgba(79,124,255,0.1)', border:'1px solid rgba(79,124,255,0.25)', color:'var(--accent)', cursor:'pointer', fontWeight:500 }}>
                    🔑 Acesso
                  </button>
                  <button onClick={() => deletarColab(c.id)}
                    style={{ fontSize:11, padding:'5px 10px', borderRadius:6, background:'none', border:'1px solid var(--border2)', color:'var(--red)', cursor:'pointer' }}>
                    Remover
                  </button>
                </div>
              </div>
            ))}
            {colaboradores.length === 0 && (
              <div style={{ gridColumn:'1/-1', textAlign:'center', padding:40, color:'var(--text3)', fontSize:12 }}>Nenhum colaborador cadastrado.</div>
            )}
          </div>
        </div>
      )}

      {/* ═══ METAS ════════════════════════════════════════════════ */}
      {aba === 'metas' && (
        <div>
          <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:14 }}>
            <button onClick={() => setModalMeta(true)} style={{ background:'var(--accent)', border:'none', borderRadius:7, padding:'8px 16px', fontSize:12, fontWeight:500, color:'#fff', cursor:'pointer' }}>+ Nova Meta</button>
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            {metas.map(m => {
              const pct = m.valor_meta > 0 ? Math.min(Math.round((m.valor_atual/m.valor_meta)*100), 100) : 0
              return (
                <div key={m.id} style={{ background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:10, padding:16 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                    <div style={{ flex:1 }}>
                      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
                        <div style={{ fontFamily:'Syne, sans-serif', fontSize:14, fontWeight:600, color:'var(--text1)' }}>{m.titulo}</div>
                        <span style={{ fontSize:10, padding:'2px 7px', borderRadius:4, background:`${TIPO_META_COR[m.tipo]}22`, color:TIPO_META_COR[m.tipo], fontWeight:500 }}>{m.tipo}</span>
                      </div>
                      {m.descricao && <div style={{ fontSize:11, color:'var(--text3)', marginBottom:6 }}>{m.descricao}</div>}
                      <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                        <div style={{ flex:1, height:6, background:'var(--bg4)', borderRadius:3, overflow:'hidden' }}>
                          <div style={{ height:'100%', width:`${pct}%`, background:pct>=100?'var(--green)':'var(--accent)', borderRadius:3 }}></div>
                        </div>
                        <span style={{ fontSize:12, fontWeight:600, color:pct>=100?'var(--green)':'var(--accent)', minWidth:36 }}>{pct}%</span>
                      </div>
                      <div style={{ fontSize:11, color:'var(--text3)', marginTop:4, display:'flex', gap:16 }}>
                        <span>Atual: <b style={{ color:'var(--text1)' }}>{m.unidade==='R$'?fmt(m.valor_atual):`${m.valor_atual} ${m.unidade}`}</b></span>
                        <span>Meta: <b style={{ color:'var(--text1)' }}>{m.unidade==='R$'?fmt(m.valor_meta):`${m.valor_meta} ${m.unidade}`}</b></span>
                        {m.data_fim && <span>Prazo: <b style={{ color:'var(--text1)' }}>{new Date(m.data_fim).toLocaleDateString('pt-BR')}</b></span>}
                        {m.colaboradores && <span>👤 {m.colaboradores.nome}</span>}
                      </div>
                    </div>
                    <input type="number" defaultValue={m.valor_atual}
                      onBlur={e => atualizarMeta(m.id, e.target.value)}
                      style={{ ...inp, width:100, padding:'6px 10px' }} placeholder="Atualizar"/>
                  </div>
                </div>
              )
            })}
            {metas.length === 0 && <div style={{ textAlign:'center', padding:40, color:'var(--text3)', fontSize:12 }}>Nenhuma meta cadastrada.</div>}
          </div>
        </div>
      )}

      {/* ═══ ACOMPANHAMENTO ═══════════════════════════════════════ */}
      {aba === 'acompanhamento' && (
        <div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10, marginBottom:16 }}>
            {[
              { label:'Total Alertas', value: alertas.length, cor:'var(--accent)' },
              { label:'Resolvidos', value: alertas.filter(a=>a.resolvido).length, cor:'var(--green)' },
              { label:'Abertos', value: alertasAbertos, cor:'var(--amber)' },
              { label:'Urgentes', value: alertasUrgentes, cor:'var(--red)' },
            ].map((m,i) => (
              <div key={i} style={{ background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:10, padding:'12px 16px' }}>
                <div style={{ fontSize:10, color:'var(--text3)', marginBottom:4 }}>{m.label.toUpperCase()}</div>
                <div style={{ fontFamily:'Syne, sans-serif', fontSize:22, fontWeight:600, color:m.cor }}>{m.value}</div>
              </div>
            ))}
          </div>
          <div style={{ background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:10, padding:16 }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
              <div style={{ fontFamily:'Syne, sans-serif', fontSize:14, fontWeight:600 }}>Todos os Alertas</div>
              <button onClick={() => setModalAlerta(true)} style={{ background:'var(--accent)', border:'none', borderRadius:7, padding:'6px 12px', fontSize:11, fontWeight:500, color:'#fff', cursor:'pointer' }}>+ Novo alerta</button>
            </div>
            {alertas.map(a => (
              <div key={a.id} style={{ display:'flex', alignItems:'center', gap:12, padding:'8px 0', borderBottom:'1px solid var(--border)', opacity:a.resolvido?0.5:1 }}>
                <span style={{ fontSize:16 }}>{a.tipo==='urgente'?'🚨':a.tipo==='aviso'?'⚠️':a.tipo==='sucesso'?'✅':'ℹ️'}</span>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:12, fontWeight:500, color:'var(--text1)' }}>{a.titulo}</div>
                  <div style={{ fontSize:10, color:'var(--text3)', marginTop:1 }}>
                    {a.colaboradores && `👤 ${a.colaboradores.nome}`}
                    {a.clientes && ` · 🏢 ${a.clientes.nome}`}
                    {` · ${new Date(a.criado_em).toLocaleDateString('pt-BR')}`}
                  </div>
                </div>
                {!a.resolvido
                  ? <button onClick={() => resolverAlerta(a.id)} style={{ fontSize:10, padding:'3px 8px', borderRadius:5, background:'rgba(34,201,122,0.1)', border:'1px solid rgba(34,201,122,0.25)', color:'var(--green)', cursor:'pointer' }}>✓ Resolver</button>
                  : <span style={{ fontSize:10, color:'var(--green)' }}>✓ Resolvido</span>
                }
              </div>
            ))}
            {alertas.length === 0 && <div style={{ textAlign:'center', padding:20, color:'var(--text3)', fontSize:12 }}>Nenhum alerta registrado.</div>}
          </div>
        </div>
      )}

      {/* ═══ AUDITORIA ════════════════════════════════════════════ */}
      {aba === 'auditoria' && (
        <div style={{ background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:10, padding:20 }}>
          <div style={{ fontFamily:'Syne, sans-serif', fontSize:14, fontWeight:600, marginBottom:14 }}>Log de Auditoria</div>
          <AuditoriaLog />
        </div>
      )}

      {/* ═══ MODAL NOVO COLABORADOR ═══════════════════════════════ */}
      {modalColab && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.7)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000 }}>
          <div style={{ background:'var(--bg2)', border:'1px solid var(--border2)', borderRadius:12, padding:24, width:380 }}>
            <div style={{ fontFamily:'Syne, sans-serif', fontSize:15, fontWeight:600, marginBottom:18 }}>Novo Colaborador</div>
            <div style={{ display:'flex', flexDirection:'column', gap:12, marginBottom:18 }}>
              <div><label style={lbl}>NOME *</label><input style={inp} value={formColab.nome} onChange={e=>setFormColab({...formColab,nome:e.target.value})} placeholder="Nome completo"/></div>
              <div><label style={lbl}>E-MAIL</label><input style={inp} value={formColab.email} onChange={e=>setFormColab({...formColab,email:e.target.value})} placeholder="email@agencia.com"/></div>
              <div><label style={lbl}>CARGO</label><input style={inp} value={formColab.cargo} onChange={e=>setFormColab({...formColab,cargo:e.target.value})} placeholder="Ex: Gestor de Tráfego"/></div>
            </div>
            <div style={{ display:'flex', gap:8, justifyContent:'flex-end' }}>
              <button onClick={()=>setModalColab(false)} style={{ background:'none', border:'1px solid var(--border2)', borderRadius:7, padding:'7px 16px', fontSize:12, color:'var(--text2)', cursor:'pointer' }}>Cancelar</button>
              <button onClick={salvarColab} disabled={!formColab.nome||saving} style={{ background:'var(--accent)', border:'none', borderRadius:7, padding:'7px 16px', fontSize:12, fontWeight:500, color:'#fff', cursor:'pointer', opacity:(!formColab.nome||saving)?0.6:1 }}>{saving?'Salvando...':'Salvar'}</button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ MODAL ACESSO AO PORTAL ═══════════════════════════════ */}
      {modalAcesso && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.7)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000 }}>
          <div style={{ background:'var(--bg2)', border:'1px solid var(--border2)', borderRadius:12, padding:24, width:500, maxHeight:'85vh', overflowY:'auto' }}>
            {/* Header */}
            <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:20 }}>
              <div style={{ width:40, height:40, borderRadius:9, background:modalAcesso.avatar_cor||'#4F7CFF', display:'flex', alignItems:'center', justifyContent:'center', fontSize:15, fontWeight:700, color:'#fff' }}>{modalAcesso.avatar_iniciais}</div>
              <div>
                <div style={{ fontFamily:'Syne, sans-serif', fontSize:15, fontWeight:600 }}>Gerenciar Acesso</div>
                <div style={{ fontSize:12, color:'var(--text3)' }}>{modalAcesso.nome} · {modalAcesso.cargo || 'Colaborador'}</div>
              </div>
            </div>

            {/* E-mail do portal */}
            <div style={{ marginBottom:18 }}>
              <label style={lbl}>E-MAIL DE ACESSO AO PORTAL</label>
              <input style={inp} value={portalEmail} onChange={e=>setPortalEmail(e.target.value)} placeholder="email@colaborador.com"/>
              <div style={{ fontSize:10, color:'var(--text3)', marginTop:5 }}>
                Este e-mail será usado para fazer login em <b style={{ color:'var(--accent)' }}>flowcrm-steel.vercel.app/portal</b>
              </div>
            </div>

            {/* Projetos vinculados */}
            <div>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
                <label style={{ ...lbl, marginBottom:0 }}>PROJETOS VISÍVEIS NO PORTAL</label>
                <span style={{ fontSize:10, color:'var(--accent)' }}>{colabProjSel.length} selecionados</span>
              </div>
              <div style={{ fontSize:11, color:'var(--text3)', marginBottom:10 }}>
                Selecione quais projetos este colaborador pode ver no portal.
              </div>

              {projetos.length === 0 && (
                <div style={{ fontSize:12, color:'var(--text3)', textAlign:'center', padding:16 }}>Nenhum projeto cadastrado ainda.</div>
              )}

              <div style={{ display:'flex', flexDirection:'column', gap:6, maxHeight:260, overflowY:'auto' }}>
                {projetos.map(p => (
                  <div key={p.id} onClick={() => toggleProjeto(p.id)}
                    style={{
                      display:'flex', alignItems:'center', gap:10, padding:'10px 12px',
                      background: colabProjSel.includes(p.id) ? 'rgba(79,124,255,0.08)' : 'var(--bg3)',
                      border: `1px solid ${colabProjSel.includes(p.id) ? 'var(--accent)' : 'var(--border2)'}`,
                      borderRadius:8, cursor:'pointer', transition:'all 0.15s',
                    }}>
                    {/* Checkbox */}
                    <div style={{
                      width:16, height:16, borderRadius:4, flexShrink:0,
                      background: colabProjSel.includes(p.id) ? 'var(--accent)' : 'var(--bg4)',
                      border:`1px solid ${colabProjSel.includes(p.id)?'var(--accent)':'var(--border2)'}`,
                      display:'flex', alignItems:'center', justifyContent:'center',
                    }}>
                      {colabProjSel.includes(p.id) && <span style={{ color:'#fff', fontSize:10 }}>✓</span>}
                    </div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:12, fontWeight:500, color:'var(--text1)' }}>{p.nome}</div>
                      <div style={{ fontSize:10, color:'var(--text3)', marginTop:1 }}>
                        {p.servico}
                        {p.clientes && ` · ${p.clientes.nome}`}
                      </div>
                    </div>
                    <span style={{
                      fontSize:10, padding:'2px 7px', borderRadius:4, fontWeight:500,
                      background:p.etapa==='concluido'?'rgba(34,201,122,0.15)':p.etapa==='andamento'?'rgba(79,124,255,0.15)':'rgba(255,255,255,0.05)',
                      color:p.etapa==='concluido'?'var(--green)':p.etapa==='andamento'?'var(--accent)':'var(--text3)',
                    }}>{p.etapa==='andamento'?'Em andamento':p.etapa==='concluido'?'Concluído':p.etapa==='revisao'?'Revisão':'Backlog'}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Instruções de acesso */}
            {portalEmail && (
              <div style={{ marginTop:16, background:'rgba(34,201,122,0.07)', border:'1px solid rgba(34,201,122,0.2)', borderRadius:8, padding:'10px 14px' }}>
                <div style={{ fontSize:11, fontWeight:500, color:'var(--green)', marginBottom:4 }}>📋 Instruções para enviar ao colaborador:</div>
                <div style={{ fontSize:11, color:'var(--text2)', lineHeight:1.7 }}>
                  Link: <b style={{ color:'var(--text1)' }}>flowcrm-steel.vercel.app/portal</b><br/>
                  E-mail: <b style={{ color:'var(--text1)' }}>{portalEmail}</b><br/>
                  Senha: <span style={{ color:'var(--text3)' }}>Qualquer valor (autenticação por e-mail)</span>
                </div>
              </div>
            )}

            <div style={{ display:'flex', gap:8, justifyContent:'flex-end', marginTop:20 }}>
              <button onClick={()=>setModalAcesso(null)} style={{ background:'none', border:'1px solid var(--border2)', borderRadius:7, padding:'7px 16px', fontSize:12, color:'var(--text2)', cursor:'pointer' }}>Cancelar</button>
              <button onClick={salvarAcesso} disabled={saving}
                style={{ background:'var(--accent)', border:'none', borderRadius:7, padding:'7px 20px', fontSize:12, fontWeight:500, color:'#fff', cursor:'pointer', opacity:saving?0.6:1 }}>
                {saving ? 'Salvando...' : '✓ Salvar acesso'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ MODAL META ═══════════════════════════════════════════ */}
      {modalMeta && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.7)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000 }}>
          <div style={{ background:'var(--bg2)', border:'1px solid var(--border2)', borderRadius:12, padding:24, width:440, maxHeight:'90vh', overflowY:'auto' }}>
            <div style={{ fontFamily:'Syne, sans-serif', fontSize:15, fontWeight:600, marginBottom:18 }}>Nova Meta</div>
            <div style={{ display:'flex', flexDirection:'column', gap:12, marginBottom:18 }}>
              <div><label style={lbl}>TÍTULO *</label><input style={inp} value={formMeta.titulo} onChange={e=>setFormMeta({...formMeta,titulo:e.target.value})} placeholder="Ex: Fechar 10 novos clientes"/></div>
              <div><label style={lbl}>DESCRIÇÃO</label><textarea style={{...inp,resize:'none'}} rows={2} value={formMeta.descricao} onChange={e=>setFormMeta({...formMeta,descricao:e.target.value})} placeholder="Detalhes..."/></div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                <div><label style={lbl}>TIPO</label>
                  <select style={inp} value={formMeta.tipo} onChange={e=>setFormMeta({...formMeta,tipo:e.target.value})}>
                    {TIPOS_META.map(t=><option key={t}>{t}</option>)}
                  </select>
                </div>
                <div><label style={lbl}>UNIDADE</label>
                  <select style={inp} value={formMeta.unidade} onChange={e=>setFormMeta({...formMeta,unidade:e.target.value})}>
                    {['R$','clientes','projetos','leads','%','horas'].map(u=><option key={u}>{u}</option>)}
                  </select>
                </div>
                <div><label style={lbl}>VALOR DA META</label><input style={inp} type="number" value={formMeta.valor_meta} onChange={e=>setFormMeta({...formMeta,valor_meta:e.target.value})} placeholder="0"/></div>
                <div><label style={lbl}>VALOR ATUAL</label><input style={inp} type="number" value={formMeta.valor_atual} onChange={e=>setFormMeta({...formMeta,valor_atual:e.target.value})} placeholder="0"/></div>
              </div>
              <div><label style={lbl}>PRAZO</label><input style={inp} type="date" value={formMeta.data_fim} onChange={e=>setFormMeta({...formMeta,data_fim:e.target.value})}/></div>
              <div><label style={lbl}>RESPONSÁVEL</label>
                <select style={inp} value={formMeta.colaborador_id} onChange={e=>setFormMeta({...formMeta,colaborador_id:e.target.value})}>
                  <option value="">Nenhum</option>
                  {colaboradores.map(c=><option key={c.id} value={c.id}>{c.nome}</option>)}
                </select>
              </div>
            </div>
            <div style={{ display:'flex', gap:8, justifyContent:'flex-end' }}>
              <button onClick={()=>setModalMeta(false)} style={{ background:'none', border:'1px solid var(--border2)', borderRadius:7, padding:'7px 16px', fontSize:12, color:'var(--text2)', cursor:'pointer' }}>Cancelar</button>
              <button onClick={salvarMeta} disabled={!formMeta.titulo||saving} style={{ background:'var(--accent)', border:'none', borderRadius:7, padding:'7px 16px', fontSize:12, fontWeight:500, color:'#fff', cursor:'pointer', opacity:(!formMeta.titulo||saving)?0.6:1 }}>{saving?'Salvando...':'Salvar'}</button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ MODAL ALERTA ═════════════════════════════════════════ */}
      {modalAlerta && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.7)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000 }}>
          <div style={{ background:'var(--bg2)', border:'1px solid var(--border2)', borderRadius:12, padding:24, width:400 }}>
            <div style={{ fontFamily:'Syne, sans-serif', fontSize:15, fontWeight:600, marginBottom:18 }}>Novo Alerta</div>
            <div style={{ display:'flex', flexDirection:'column', gap:12, marginBottom:18 }}>
              <div><label style={lbl}>TÍTULO *</label><input style={inp} value={formAlerta.titulo} onChange={e=>setFormAlerta({...formAlerta,titulo:e.target.value})} placeholder="Ex: Projeto atrasado"/></div>
              <div><label style={lbl}>TIPO</label>
                <select style={inp} value={formAlerta.tipo} onChange={e=>setFormAlerta({...formAlerta,tipo:e.target.value})}>
                  {[['info','ℹ️ Info'],['aviso','⚠️ Aviso'],['urgente','🚨 Urgente'],['sucesso','✅ Sucesso']].map(([v,l])=><option key={v} value={v}>{l}</option>)}
                </select>
              </div>
              <div><label style={lbl}>DESCRIÇÃO</label><textarea style={{...inp,resize:'none'}} rows={2} value={formAlerta.descricao} onChange={e=>setFormAlerta({...formAlerta,descricao:e.target.value})} placeholder="Detalhes..."/></div>
              <div><label style={lbl}>COLABORADOR</label>
                <select style={inp} value={formAlerta.colaborador_id} onChange={e=>setFormAlerta({...formAlerta,colaborador_id:e.target.value})}>
                  <option value="">Nenhum</option>
                  {colaboradores.map(c=><option key={c.id} value={c.id}>{c.nome}</option>)}
                </select>
              </div>
              <div><label style={lbl}>CLIENTE</label>
                <select style={inp} value={formAlerta.cliente_id} onChange={e=>setFormAlerta({...formAlerta,cliente_id:e.target.value})}>
                  <option value="">Nenhum</option>
                  {clientes.map(c=><option key={c.id} value={c.id}>{c.nome}</option>)}
                </select>
              </div>
            </div>
            <div style={{ display:'flex', gap:8, justifyContent:'flex-end' }}>
              <button onClick={()=>setModalAlerta(false)} style={{ background:'none', border:'1px solid var(--border2)', borderRadius:7, padding:'7px 16px', fontSize:12, color:'var(--text2)', cursor:'pointer' }}>Cancelar</button>
              <button onClick={salvarAlerta} disabled={!formAlerta.titulo||saving} style={{ background:'var(--accent)', border:'none', borderRadius:7, padding:'7px 16px', fontSize:12, fontWeight:500, color:'#fff', cursor:'pointer', opacity:(!formAlerta.titulo||saving)?0.6:1 }}>{saving?'Salvando...':'Salvar'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function AuditoriaLog() {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    supabase.from('auditoria_exportacoes').select('*').order('criado_em', { ascending: false }).limit(30)
      .then(({ data }) => { setLogs(data||[]); setLoading(false) })
  }, [])
  const tipoCor = { csv:'var(--green)', pdf:'var(--accent)', importacao:'var(--amber)' }
  return (
    <div>
      {loading && <div style={{ fontSize:12, color:'var(--text3)' }}>Carregando...</div>}
      {!loading && logs.length === 0 && <div style={{ fontSize:12, color:'var(--text3)', textAlign:'center', padding:20 }}>Nenhuma operação registrada ainda.</div>}
      {logs.map(log => (
        <div key={log.id} style={{ display:'flex', alignItems:'center', gap:12, padding:'8px 0', borderBottom:'1px solid var(--border)' }}>
          <span style={{ fontSize:10, padding:'2px 7px', borderRadius:4, fontWeight:500, background:`${tipoCor[log.tipo_exportacao]||'var(--accent)'}22`, color:tipoCor[log.tipo_exportacao]||'var(--accent)', whiteSpace:'nowrap' }}>{log.tipo_exportacao}</span>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:12, color:'var(--text1)' }}>{log.finalidade}</div>
            <div style={{ fontSize:10, color:'var(--text3)' }}>{log.usuario_email} · {new Date(log.criado_em).toLocaleString('pt-BR')}</div>
          </div>
          <div style={{ fontSize:11, fontWeight:500, color:'var(--text2)', whiteSpace:'nowrap' }}>{log.registros_afetados} registros</div>
        </div>
      ))}
    </div>
  )
}
