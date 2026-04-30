import React, { useEffect, useState } from 'react'
import { supabase, clientesAPI } from '../lib/supabase.js'

const TIPOS = ['Reunião Online','Reunião Presencial','Ligação','Follow-up','Apresentação','Outro']
const TIPO_ICON = {
  'Reunião Online':'🎥','Reunião Presencial':'🤝','Ligação':'📞',
  'Follow-up':'📩','Apresentação':'📊','Outro':'📌',
}
const TIPO_COR = {
  'Reunião Online':'var(--accent)',
  'Reunião Presencial':'var(--green)',
  'Ligação':'var(--amber)',
  'Follow-up':'var(--accent2)',
  'Apresentação':'var(--red)',
  'Outro':'var(--text3)',
}
const STATUS_COR = {
  agendado:'var(--accent)',
  realizado:'var(--green)',
  cancelado:'var(--red)',
}
const STATUS_LABEL = { agendado:'Agendado', realizado:'Realizado', cancelado:'Cancelado' }

const FORM_INICIAL = {
  titulo:'', tipo:'Reunião Online',
  data: new Date().toISOString().split('T')[0],
  horario:'09:00', cliente_id:'', descricao:'',
}

export default function Agenda() {
  const [eventos, setEventos]     = useState([])
  const [clientes, setClientes]   = useState([])
  const [loading, setLoading]     = useState(true)
  const [modal, setModal]         = useState(false)
  const [form, setForm]           = useState(FORM_INICIAL)
  const [saving, setSaving]       = useState(false)
  const [filtro, setFiltro]       = useState('todos')
  const [view, setView]           = useState('lista') // lista | calendario

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const [{ data: ev }, { data: cl }] = await Promise.all([
      supabase.from('eventos').select('*, clientes(nome, cor, iniciais)').order('data').order('horario'),
      clientesAPI.listar(),
    ])
    setEventos(ev || [])
    setClientes(cl || [])
    setLoading(false)
  }

  async function handleSave() {
    setSaving(true)
    await supabase.from('eventos').insert({
      ...form,
      cliente_id: form.cliente_id || null,
      participantes: ['Bruno Galvão'],
    })
    setModal(false)
    setForm(FORM_INICIAL)
    await load()
    setSaving(false)
  }

  async function atualizarStatus(id, status) {
    await supabase.from('eventos').update({ status }).eq('id', id)
    await load()
  }

  async function deletar(id) {
    if (!confirm('Remover este evento?')) return
    await supabase.from('eventos').delete().eq('id', id)
    await load()
  }

  const hoje = new Date().toISOString().split('T')[0]
  const filtrados = eventos.filter(e => {
    if (filtro === 'hoje') return e.data === hoje
    if (filtro === 'semana') {
      const d = new Date(e.data)
      const now = new Date()
      const diff = (d - now) / (1000 * 60 * 60 * 24)
      return diff >= -1 && diff <= 7
    }
    if (filtro === 'agendados') return e.status === 'agendado'
    return true
  })

  // Agrupar por data
  const porData = filtrados.reduce((acc, ev) => {
    const d = ev.data
    if (!acc[d]) acc[d] = []
    acc[d].push(ev)
    return acc
  }, {})

  const inp = {
    width:'100%', background:'var(--bg3)', border:'1px solid var(--border2)',
    borderRadius:7, padding:'8px 12px', color:'var(--text1)',
    fontSize:12, outline:'none', fontFamily:'DM Sans, sans-serif',
  }
  const lbl = { fontSize:11, color:'var(--text3)', display:'block', marginBottom:4, letterSpacing:'0.3px' }

  function formatData(d) {
    if (!d) return ''
    const [y,m,day] = d.split('-')
    const meses = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
    const data = new Date(y, m-1, day)
    const dias = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb']
    if (d === hoje) return 'Hoje'
    const amanha = new Date(); amanha.setDate(amanha.getDate()+1)
    if (d === amanha.toISOString().split('T')[0]) return 'Amanhã'
    return `${dias[data.getDay()]}, ${day} ${meses[m-1]}`
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
        <div>
          <h1 style={{ fontFamily:'Syne, sans-serif', fontSize:20, fontWeight:700 }}>Agenda</h1>
          <div style={{ fontSize:12, color:'var(--text3)', marginTop:2 }}>
            {eventos.filter(e => e.status==='agendado').length} eventos agendados
          </div>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          {/* Filtros */}
          <div style={{ display:'flex', gap:4, background:'var(--bg2)', borderRadius:8, padding:3 }}>
            {[
              { id:'todos', label:'Todos' },
              { id:'hoje', label:'Hoje' },
              { id:'semana', label:'Semana' },
              { id:'agendados', label:'Agendados' },
            ].map(f => (
              <button key={f.id} onClick={() => setFiltro(f.id)}
                style={{ padding:'5px 12px', borderRadius:6, fontSize:11, fontWeight:500, cursor:'pointer', border:'none', fontFamily:'DM Sans, sans-serif', background: filtro===f.id ? 'var(--bg4)' : 'none', color: filtro===f.id ? 'var(--text1)' : 'var(--text3)' }}>
                {f.label}
              </button>
            ))}
          </div>
          <button onClick={() => setModal(true)}
            style={{ background:'var(--accent)', border:'none', borderRadius:7, padding:'8px 16px', fontSize:12, fontWeight:500, color:'#fff', cursor:'pointer', whiteSpace:'nowrap' }}>
            + Novo Evento
          </button>
        </div>
      </div>

      {/* Métricas rápidas */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10, marginBottom:18 }}>
        {[
          { label:'Hoje', value: eventos.filter(e=>e.data===hoje).length, cor:'var(--accent)' },
          { label:'Esta semana', value: eventos.filter(e=>{ const d=new Date(e.data); const n=new Date(); return (d-n)/(864e5)>=-1&&(d-n)/(864e5)<=7 }).length, cor:'var(--amber)' },
          { label:'Agendados', value: eventos.filter(e=>e.status==='agendado').length, cor:'var(--green)' },
          { label:'Realizados', value: eventos.filter(e=>e.status==='realizado').length, cor:'var(--accent2)' },
        ].map((m,i) => (
          <div key={i} style={{ background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:10, padding:'12px 16px' }}>
            <div style={{ fontSize:10, color:'var(--text3)', marginBottom:4, letterSpacing:'0.3px' }}>{m.label.toUpperCase()}</div>
            <div style={{ fontFamily:'Syne, sans-serif', fontSize:22, fontWeight:600, color:m.cor }}>{m.value}</div>
          </div>
        ))}
      </div>

      {/* Lista de eventos */}
      {loading && <div style={{ fontSize:12, color:'var(--text3)', padding:'20px 0' }}>Carregando eventos...</div>}

      {!loading && filtrados.length === 0 && (
        <div style={{ background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:10, padding:40, textAlign:'center' }}>
          <div style={{ fontSize:28, marginBottom:10 }}>📅</div>
          <div style={{ fontSize:13, color:'var(--text2)', fontWeight:500, marginBottom:4 }}>Nenhum evento encontrado</div>
          <div style={{ fontSize:12, color:'var(--text3)' }}>Clique em "+ Novo Evento" para agendar</div>
        </div>
      )}

      {Object.entries(porData).map(([data, evs]) => (
        <div key={data} style={{ marginBottom:20 }}>
          {/* Label da data */}
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:10 }}>
            <div style={{ fontFamily:'Syne, sans-serif', fontSize:13, fontWeight:600, color: data===hoje ? 'var(--accent)' : 'var(--text2)' }}>
              {formatData(data)}
            </div>
            <div style={{ flex:1, height:1, background:'var(--border)' }}></div>
            <div style={{ fontSize:11, color:'var(--text3)' }}>{evs.length} evento{evs.length>1?'s':''}</div>
          </div>

          {/* Cards dos eventos */}
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {evs.map(ev => (
              <div key={ev.id} style={{
                background:'var(--bg2)', border:`1px solid ${ev.status==='cancelado'?'var(--border)':'var(--border2)'}`,
                borderLeft:`3px solid ${TIPO_COR[ev.tipo]||'var(--accent)'}`,
                borderRadius:10, padding:'12px 16px',
                opacity: ev.status==='cancelado' ? 0.6 : 1,
                display:'flex', alignItems:'center', gap:14,
              }}>
                {/* Horário */}
                <div style={{ textAlign:'center', minWidth:44, flexShrink:0 }}>
                  <div style={{ fontFamily:'Syne, sans-serif', fontSize:15, fontWeight:600, color:'var(--text1)' }}>
                    {ev.horario?.slice(0,5)}
                  </div>
                </div>

                {/* Ícone */}
                <div style={{ fontSize:20, flexShrink:0 }}>{TIPO_ICON[ev.tipo]||'📌'}</div>

                {/* Conteúdo */}
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:2 }}>
                    <div style={{ fontFamily:'Syne, sans-serif', fontSize:13, fontWeight:600, color:'var(--text1)' }}>
                      {ev.titulo}
                    </div>
                    <span style={{ fontSize:10, padding:'2px 7px', borderRadius:4, fontWeight:500, background:`${TIPO_COR[ev.tipo]||'var(--accent)'}22`, color:TIPO_COR[ev.tipo]||'var(--accent)' }}>
                      {ev.tipo}
                    </span>
                  </div>
                  {ev.clientes && (
                    <div style={{ display:'flex', alignItems:'center', gap:6, marginTop:3 }}>
                      <div style={{ width:16, height:16, borderRadius:4, background:ev.clientes.cor||'#4F7CFF', display:'flex', alignItems:'center', justifyContent:'center', fontSize:8, fontWeight:700, color:'#fff' }}>
                        {ev.clientes.iniciais}
                      </div>
                      <span style={{ fontSize:11, color:'var(--text3)' }}>{ev.clientes.nome}</span>
                    </div>
                  )}
                  {ev.descricao && (
                    <div style={{ fontSize:11, color:'var(--text3)', marginTop:3 }}>{ev.descricao}</div>
                  )}
                </div>

                {/* Status e ações */}
                <div style={{ display:'flex', alignItems:'center', gap:8, flexShrink:0 }}>
                  <span style={{ fontSize:10, padding:'2px 7px', borderRadius:4, fontWeight:500, background:`${STATUS_COR[ev.status]}22`, color:STATUS_COR[ev.status] }}>
                    {STATUS_LABEL[ev.status]}
                  </span>
                  {ev.status === 'agendado' && (
                    <button onClick={() => atualizarStatus(ev.id,'realizado')}
                      style={{ fontSize:10, padding:'3px 8px', borderRadius:5, background:'rgba(34,201,122,0.1)', border:'1px solid rgba(34,201,122,0.25)', color:'var(--green)', cursor:'pointer' }}>
                      ✓ Realizado
                    </button>
                  )}
                  {ev.status === 'agendado' && (
                    <button onClick={() => atualizarStatus(ev.id,'cancelado')}
                      style={{ fontSize:10, padding:'3px 8px', borderRadius:5, background:'none', border:'1px solid var(--border2)', color:'var(--text3)', cursor:'pointer' }}>
                      Cancelar
                    </button>
                  )}
                  <button onClick={() => deletar(ev.id)}
                    style={{ fontSize:10, padding:'3px 6px', borderRadius:5, background:'none', border:'none', color:'var(--text3)', cursor:'pointer' }}>
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Modal novo evento */}
      {modal && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.7)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000 }}>
          <div style={{ background:'var(--bg2)', border:'1px solid var(--border2)', borderRadius:12, padding:24, width:420 }}>
            <div style={{ fontFamily:'Syne, sans-serif', fontSize:15, fontWeight:600, marginBottom:4 }}>Novo Evento</div>
            <div style={{ fontSize:12, color:'var(--text3)', marginBottom:18 }}>Preencha os dados para agendar.</div>

            <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
              {/* Título */}
              <div>
                <label style={lbl}>TÍTULO *</label>
                <input style={inp} value={form.titulo} onChange={e => setForm({...form, titulo:e.target.value})} placeholder="Nome do evento"/>
              </div>

              {/* Tipo */}
              <div>
                <label style={lbl}>TIPO</label>
                <select style={inp} value={form.tipo} onChange={e => setForm({...form, tipo:e.target.value})}>
                  {TIPOS.map(t => <option key={t}>{t}</option>)}
                </select>
              </div>

              {/* Data e Horário */}
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                <div>
                  <label style={lbl}>DATA</label>
                  <input style={inp} type="date" value={form.data} onChange={e => setForm({...form, data:e.target.value})}/>
                </div>
                <div>
                  <label style={lbl}>HORÁRIO</label>
                  <input style={inp} type="time" value={form.horario} onChange={e => setForm({...form, horario:e.target.value})}/>
                </div>
              </div>

              {/* Cliente / Participante */}
              <div>
                <label style={{ ...lbl, display:'flex', alignItems:'center', gap:5 }}>
                  <svg width="13" height="13" viewBox="0 0 16 16" fill="none"><circle cx="6" cy="5" r="3" stroke="currentColor" strokeWidth="1.5"/><path d="M1 13c0-2.761 2.239-5 5-5h2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                  PARTICIPANTE / CLIENTE
                </label>
                <select style={inp} value={form.cliente_id} onChange={e => setForm({...form, cliente_id:e.target.value})}>
                  <option value="">Nenhum</option>
                  {clientes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                </select>
              </div>

              {/* Participante fixo */}
              <div style={{ background:'var(--bg3)', border:'1px solid var(--border2)', borderRadius:8, padding:'10px 12px', display:'flex', alignItems:'center', gap:10 }}>
                <div style={{ width:28, height:28, borderRadius:'50%', background:'linear-gradient(135deg,#4F7CFF,#7B5CFF)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:600, color:'#fff', flexShrink:0 }}>BG</div>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:12, fontWeight:500, color:'var(--text1)' }}>Bruno Galvão</div>
                  <div style={{ fontSize:10, color:'var(--text3)' }}>bgalvao1@gmail.com</div>
                </div>
                <span style={{ fontSize:10, background:'rgba(79,124,255,0.15)', color:'var(--accent)', padding:'2px 8px', borderRadius:4, fontWeight:500 }}>Owner</span>
              </div>

              {/* Descrição */}
              <div>
                <label style={lbl}>DESCRIÇÃO (opcional)</label>
                <textarea style={{ ...inp, resize:'none' }} rows={2}
                  value={form.descricao} onChange={e => setForm({...form, descricao:e.target.value})}
                  placeholder="Pauta, link da reunião, observações..."/>
              </div>
            </div>

            <div style={{ display:'flex', gap:8, justifyContent:'flex-end', marginTop:20 }}>
              <button onClick={() => setModal(false)}
                style={{ background:'none', border:'1px solid var(--border2)', borderRadius:7, padding:'8px 16px', fontSize:12, color:'var(--text2)', cursor:'pointer' }}>
                Cancelar
              </button>
              <button onClick={handleSave} disabled={!form.titulo || saving}
                style={{ background:'var(--accent)', border:'none', borderRadius:7, padding:'8px 20px', fontSize:13, fontWeight:500, color:'#fff', cursor:'pointer', opacity:(!form.titulo||saving)?0.6:1 }}>
                {saving ? 'Salvando...' : 'Criar Evento'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Exportar componente de Tarefas separado para uso interno
export { default as AgendaPage } from './Agenda.jsx'
