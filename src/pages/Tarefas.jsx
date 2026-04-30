import React, { useEffect, useState } from 'react'
import { supabase, clientesAPI } from '../lib/supabase.js'

const PRIORIDADES = ['Baixa','Media','Alta','Urgente']
const PRIO_COR = {
  'Baixa':'var(--text3)',
  'Media':'var(--amber)',
  'Alta':'var(--red)',
  'Urgente':'#FF0000',
}
const PRIO_ICON = { 'Baixa':'⚪','Media':'🟡','Alta':'🔴','Urgente':'🚨' }
const REPETICOES = ['Nao repete','Todo dia','Toda semana','Todo mes']

const FORM_INICIAL = {
  titulo:'', descricao:'', backlog:false,
  data: new Date().toISOString().split('T')[0],
  horario:'', prioridade:'Media',
  repetir:'Nao repete', cliente_id:'',
}

export default function Tarefas() {
  const [tarefas, setTarefas]   = useState([])
  const [clientes, setClientes] = useState([])
  const [loading, setLoading]   = useState(true)
  const [modal, setModal]       = useState(false)
  const [form, setForm]         = useState(FORM_INICIAL)
  const [saving, setSaving]     = useState(false)
  const [filtro, setFiltro]     = useState('pendentes')

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const [{ data: t }, { data: c }] = await Promise.all([
      supabase.from('tarefas_agenda')
        .select('*, clientes(nome, cor, iniciais)')
        .order('backlog').order('data', { nullsFirst: false }).order('horario', { nullsFirst: false }),
      clientesAPI.listar(),
    ])
    setTarefas(t || [])
    setClientes(c || [])
    setLoading(false)
  }

  async function handleSave() {
    setSaving(true)
    const payload = {
      ...form,
      data: form.backlog ? null : form.data,
      horario: form.horario || null,
      cliente_id: form.cliente_id || null,
    }
    await supabase.from('tarefas_agenda').insert(payload)
    setModal(false)
    setForm(FORM_INICIAL)
    await load()
    setSaving(false)
  }

  async function toggleConcluida(id, concluida) {
    await supabase.from('tarefas_agenda').update({ concluida }).eq('id', id)
    await load()
  }

  async function deletar(id) {
    if (!confirm('Remover tarefa?')) return
    await supabase.from('tarefas_agenda').delete().eq('id', id)
    await load()
  }

  const hoje = new Date().toISOString().split('T')[0]

  const filtradas = tarefas.filter(t => {
    if (filtro === 'pendentes') return !t.concluida
    if (filtro === 'concluidas') return t.concluida
    if (filtro === 'hoje') return t.data === hoje && !t.concluida
    if (filtro === 'backlog') return t.backlog
    if (filtro === 'urgente') return t.prioridade === 'Urgente' || t.prioridade === 'Alta'
    return true
  })

  // Separar backlog das demais
  const backlog = filtradas.filter(t => t.backlog)
  const comData = filtradas.filter(t => !t.backlog)

  // Agrupar por data
  const porData = comData.reduce((acc, t) => {
    const d = t.data || 'sem-data'
    if (!acc[d]) acc[d] = []
    acc[d].push(t)
    return acc
  }, {})

  const inp = {
    width:'100%', background:'var(--bg3)', border:'1px solid var(--border2)',
    borderRadius:7, padding:'8px 12px', color:'var(--text1)',
    fontSize:12, outline:'none', fontFamily:'DM Sans, sans-serif',
  }
  const lbl = { fontSize:11, color:'var(--text3)', display:'block', marginBottom:4, letterSpacing:'0.3px' }

  function formatData(d) {
    if (!d || d === 'sem-data') return 'Sem data'
    const [y,m,day] = d.split('-')
    const meses = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
    const data = new Date(y, m-1, day)
    const dias = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb']
    if (d === hoje) return 'Hoje'
    const amanha = new Date(); amanha.setDate(amanha.getDate()+1)
    if (d === amanha.toISOString().split('T')[0]) return 'Amanhã'
    return `${dias[data.getDay()]}, ${day} ${meses[m-1]}`
  }

  const TarefaCard = ({ t }) => (
    <div style={{
      background:'var(--bg2)', border:'1px solid var(--border2)',
      borderLeft:`3px solid ${PRIO_COR[t.prioridade]||'var(--text3)'}`,
      borderRadius:9, padding:'11px 14px', marginBottom:6,
      opacity: t.concluida ? 0.55 : 1, transition:'all 0.15s',
      display:'flex', alignItems:'flex-start', gap:12,
    }}>
      {/* Checkbox */}
      <div onClick={() => toggleConcluida(t.id, !t.concluida)}
        style={{
          width:18, height:18, borderRadius:4, flexShrink:0, marginTop:1, cursor:'pointer',
          background: t.concluida ? 'var(--green)' : 'var(--bg4)',
          border:`1px solid ${t.concluida ? 'var(--green)' : 'var(--border2)'}`,
          display:'flex', alignItems:'center', justifyContent:'center',
        }}>
        {t.concluida && <span style={{ color:'#fff', fontSize:11 }}>✓</span>}
      </div>

      {/* Conteúdo */}
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:2 }}>
          <div style={{ fontSize:13, fontWeight:500, color: t.concluida ? 'var(--text3)' : 'var(--text1)', textDecoration: t.concluida ? 'line-through' : 'none' }}>
            {t.titulo}
          </div>
          <span style={{ fontSize:10 }}>{PRIO_ICON[t.prioridade]}</span>
          {t.repetir && t.repetir !== 'Nao repete' && (
            <span style={{ fontSize:10, color:'var(--accent)', background:'rgba(79,124,255,0.1)', padding:'1px 6px', borderRadius:4 }}>
              🔁 {t.repetir}
            </span>
          )}
        </div>
        {t.descricao && (
          <div style={{ fontSize:11, color:'var(--text3)', marginBottom:3, lineHeight:1.5 }}>{t.descricao}</div>
        )}
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          {t.horario && (
            <span style={{ fontSize:11, color:'var(--text3)' }}>⏰ {t.horario?.slice(0,5)}</span>
          )}
          {t.clientes && (
            <div style={{ display:'flex', alignItems:'center', gap:5 }}>
              <div style={{ width:14, height:14, borderRadius:3, background:t.clientes.cor||'#4F7CFF', display:'flex', alignItems:'center', justifyContent:'center', fontSize:7, fontWeight:700, color:'#fff' }}>
                {t.clientes.iniciais}
              </div>
              <span style={{ fontSize:11, color:'var(--text3)' }}>{t.clientes.nome}</span>
            </div>
          )}
        </div>
      </div>

      {/* Deletar */}
      <button onClick={() => deletar(t.id)}
        style={{ background:'none', border:'none', color:'var(--text3)', cursor:'pointer', fontSize:14, padding:'0 2px', flexShrink:0 }}>
        ✕
      </button>
    </div>
  )

  return (
    <div>
      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
        <div>
          <h1 style={{ fontFamily:'Syne, sans-serif', fontSize:20, fontWeight:700 }}>Tarefas</h1>
          <div style={{ fontSize:12, color:'var(--text3)', marginTop:2 }}>
            {tarefas.filter(t => !t.concluida).length} pendentes · {tarefas.filter(t => t.backlog).length} no backlog
          </div>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <div style={{ display:'flex', gap:4, background:'var(--bg2)', borderRadius:8, padding:3 }}>
            {[
              { id:'pendentes', label:'Pendentes' },
              { id:'hoje', label:'Hoje' },
              { id:'urgente', label:'Urgentes' },
              { id:'backlog', label:'Backlog' },
              { id:'concluidas', label:'Concluídas' },
            ].map(f => (
              <button key={f.id} onClick={() => setFiltro(f.id)}
                style={{ padding:'5px 10px', borderRadius:6, fontSize:11, fontWeight:500, cursor:'pointer', border:'none', fontFamily:'DM Sans, sans-serif', background: filtro===f.id ? 'var(--bg4)' : 'none', color: filtro===f.id ? 'var(--text1)' : 'var(--text3)' }}>
                {f.label}
              </button>
            ))}
          </div>
          <button onClick={() => setModal(true)}
            style={{ background:'var(--accent)', border:'none', borderRadius:7, padding:'8px 16px', fontSize:12, fontWeight:500, color:'#fff', cursor:'pointer', whiteSpace:'nowrap' }}>
            + Nova Tarefa
          </button>
        </div>
      </div>

      {/* Métricas */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10, marginBottom:18 }}>
        {[
          { label:'Pendentes', value: tarefas.filter(t=>!t.concluida&&!t.backlog).length, cor:'var(--accent)' },
          { label:'Hoje', value: tarefas.filter(t=>t.data===hoje&&!t.concluida).length, cor:'var(--amber)' },
          { label:'Urgentes', value: tarefas.filter(t=>t.prioridade==='Urgente'&&!t.concluida).length, cor:'var(--red)' },
          { label:'Concluídas', value: tarefas.filter(t=>t.concluida).length, cor:'var(--green)' },
        ].map((m,i) => (
          <div key={i} style={{ background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:10, padding:'12px 16px' }}>
            <div style={{ fontSize:10, color:'var(--text3)', marginBottom:4, letterSpacing:'0.3px' }}>{m.label.toUpperCase()}</div>
            <div style={{ fontFamily:'Syne, sans-serif', fontSize:22, fontWeight:600, color:m.cor }}>{m.value}</div>
          </div>
        ))}
      </div>

      {loading && <div style={{ fontSize:12, color:'var(--text3)', padding:'20px 0' }}>Carregando tarefas...</div>}

      {!loading && filtradas.length === 0 && (
        <div style={{ background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:10, padding:40, textAlign:'center' }}>
          <div style={{ fontSize:28, marginBottom:10 }}>✅</div>
          <div style={{ fontSize:13, color:'var(--text2)', fontWeight:500 }}>Nenhuma tarefa aqui</div>
          <div style={{ fontSize:12, color:'var(--text3)', marginTop:4 }}>Clique em "+ Nova Tarefa" para adicionar</div>
        </div>
      )}

      {/* Tarefas com data */}
      {Object.entries(porData).sort(([a],[b]) => a.localeCompare(b)).map(([data, ts]) => (
        <div key={data} style={{ marginBottom:20 }}>
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:8 }}>
            <div style={{ fontFamily:'Syne, sans-serif', fontSize:12, fontWeight:600, color: data===hoje ? 'var(--accent)' : 'var(--text2)' }}>
              {formatData(data)}
            </div>
            <div style={{ flex:1, height:1, background:'var(--border)' }}></div>
            <span style={{ fontSize:11, color:'var(--text3)' }}>{ts.length} tarefa{ts.length>1?'s':''}</span>
          </div>
          {ts.map(t => <TarefaCard key={t.id} t={t} />)}
        </div>
      ))}

      {/* Backlog */}
      {backlog.length > 0 && (
        <div style={{ marginBottom:20 }}>
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:8 }}>
            <div style={{ fontFamily:'Syne, sans-serif', fontSize:12, fontWeight:600, color:'var(--text3)' }}>
              Backlog — para fazer quando der
            </div>
            <div style={{ flex:1, height:1, background:'var(--border)' }}></div>
            <span style={{ fontSize:11, color:'var(--text3)' }}>{backlog.length}</span>
          </div>
          {backlog.map(t => <TarefaCard key={t.id} t={t} />)}
        </div>
      )}

      {/* Modal */}
      {modal && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.7)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000 }}>
          <div style={{ background:'var(--bg2)', border:'1px solid var(--border2)', borderRadius:12, padding:24, width:420, maxHeight:'90vh', overflowY:'auto' }}>
            <div style={{ fontFamily:'Syne, sans-serif', fontSize:15, fontWeight:600, marginBottom:4 }}>Nova Tarefa</div>
            <div style={{ fontSize:12, color:'var(--text3)', marginBottom:18 }}>Preencha os dados da tarefa.</div>

            <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
              {/* Título */}
              <div>
                <label style={lbl}>TÍTULO *</label>
                <input style={inp} value={form.titulo} onChange={e => setForm({...form, titulo:e.target.value})} placeholder="Ex: Responder e-mails"/>
              </div>

              {/* Descrição */}
              <div>
                <label style={lbl}>DESCRIÇÃO</label>
                <textarea style={{ ...inp, resize:'none' }} rows={3}
                  value={form.descricao} onChange={e => setForm({...form, descricao:e.target.value})}
                  placeholder="Detalhes opcionais..."/>
              </div>

              {/* Backlog toggle */}
              <div style={{ background:'var(--bg3)', border:'1px solid var(--border2)', borderRadius:8, padding:'12px 14px' }}>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:3 }}>
                  <span style={{ fontSize:12, fontWeight:500, color:'var(--text1)' }}>Sem data (backlog)</span>
                  <div onClick={() => setForm({...form, backlog:!form.backlog})}
                    style={{
                      width:38, height:20, borderRadius:10, cursor:'pointer', transition:'all 0.2s',
                      background: form.backlog ? 'var(--accent)' : 'var(--bg4)',
                      position:'relative',
                    }}>
                    <div style={{
                      width:16, height:16, borderRadius:'50%', background:'#fff',
                      position:'absolute', top:2, transition:'all 0.2s',
                      left: form.backlog ? 20 : 2,
                    }}></div>
                  </div>
                </div>
                <div style={{ fontSize:11, color:'var(--text3)' }}>Para fazer quando der — não aparece no calendário.</div>
              </div>

              {/* Data e Horário — só aparece se não for backlog */}
              {!form.backlog && (
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                  <div>
                    <label style={lbl}>DATA *</label>
                    <input style={inp} type="date" value={form.data} onChange={e => setForm({...form, data:e.target.value})}/>
                  </div>
                  <div>
                    <label style={lbl}>HORÁRIO</label>
                    <input style={inp} type="time" value={form.horario} onChange={e => setForm({...form, horario:e.target.value})}/>
                  </div>
                </div>
              )}

              {/* Prioridade */}
              <div>
                <label style={lbl}>PRIORIDADE</label>
                <select style={inp} value={form.prioridade} onChange={e => setForm({...form, prioridade:e.target.value})}>
                  {PRIORIDADES.map(p => (
                    <option key={p} value={p}>{PRIO_ICON[p]} {p}</option>
                  ))}
                </select>
              </div>

              {/* Repetir */}
              <div>
                <label style={lbl}>REPETIR</label>
                <select style={inp} value={form.repetir} onChange={e => setForm({...form, repetir:e.target.value})}>
                  {REPETICOES.map(r => <option key={r}>{r}</option>)}
                </select>
              </div>

              {/* Cliente */}
              <div>
                <label style={lbl}>CLIENTE / PROJETO (opcional)</label>
                <select style={inp} value={form.cliente_id} onChange={e => setForm({...form, cliente_id:e.target.value})}>
                  <option value="">Nenhum</option>
                  {clientes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                </select>
              </div>
            </div>

            <div style={{ display:'flex', gap:8, justifyContent:'flex-end', marginTop:20 }}>
              <button onClick={() => setModal(false)}
                style={{ background:'none', border:'1px solid var(--border2)', borderRadius:7, padding:'8px 16px', fontSize:12, color:'var(--text2)', cursor:'pointer' }}>
                Cancelar
              </button>
              <button onClick={handleSave} disabled={!form.titulo || saving}
                style={{ background:'var(--accent)', border:'none', borderRadius:7, padding:'8px 20px', fontSize:13, fontWeight:500, color:'#fff', cursor:'pointer', opacity:(!form.titulo||saving)?0.6:1 }}>
                {saving ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
