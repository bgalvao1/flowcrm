import { toast } from '../lib/toast.js'
import React, { useEffect, useState } from 'react'
import { projetosAPI, tarefasAPI, clientesAPI } from '../lib/supabase.js'

const ETAPAS = [
  { id:'backlog', label:'Backlog', cor:'#5C6478' },
  { id:'andamento', label:'Em andamento', cor:'#4F7CFF' },
  { id:'revisao', label:'Revisão', cor:'#F5A623' },
  { id:'concluido', label:'Concluído', cor:'#22C97A' },
]
const SERVICOS = ['Tráfego Pago','Site','Landing Page','Agente IA','App Mobile','SaaS','Consultoria','Redes Sociais']

export default function Projetos() {
  const [projetos, setProjetos] = useState([])
  const [clientes, setClientes] = useState([])
  const [selected, setSelected] = useState(null)
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({ nome:'', cliente_id:'', servico:'Site', etapa:'backlog', prazo:'' })
  const [novaTarefa, setNovaTarefa] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const [{ data: p }, { data: c }] = await Promise.all([projetosAPI.listar(), clientesAPI.listar()])
    setProjetos(p || [])
    setClientes(c || [])
    if (selected) setSelected((p || []).find(x => x.id === selected.id) || null)
    setLoading(false)
  }

  async function handleSave() {
    setSaving(true)
    const { error } = await projetosAPI.criar({ ...form })
    setSaving(false)
    if (error) { toast.error('Erro ao criar projeto'); return }
    toast.success('Projeto criado')
    setModal(false)
    setForm({ nome:'', cliente_id:'', servico:'Site', etapa:'backlog', prazo:'' })
    await load()
  }

  async function toggleTarefa(tarefaId, concluida, projetoId) {
    await tarefasAPI.toggle(tarefaId, concluida, projetoId)
    await load()
  }

  async function addTarefa(projetoId) {
    if (!novaTarefa.trim()) return
    await tarefasAPI.criar(projetoId, novaTarefa.trim())
    setNovaTarefa('')
    await load()
  }

  async function mover(id, etapa) {
    await projetosAPI.moverEtapa(id, etapa)
    await load()
  }

  const inp = { width:'100%', background:'var(--bg3)', border:'1px solid var(--border2)', borderRadius:7, padding:'8px 12px', color:'var(--text1)', fontSize:12, outline:'none', fontFamily:'DM Sans, sans-serif' }
  const lbl = { fontSize:11, color:'var(--text3)', display:'block', marginBottom:4, letterSpacing:'0.3px' }

  return (
    <div style={{ display:'flex', gap:0, height:'calc(100vh - 80px)' }}>
      {/* Kanban */}
      <div style={{ flex:1, overflowY:'auto', paddingRight: selected ? 12 : 0 }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
          <h1 className="page-title">Projetos & Tarefas</h1>
          <button onClick={() => setModal(true)} className="btn btn-primary">+ Novo Projeto</button>
        </div>

        <div style={{ display:'flex', gap:10, overflowX:'auto', alignItems:'flex-start', paddingBottom:8 }}>
          {ETAPAS.map(etapa => {
            const ep = projetos.filter(p => p.etapa === etapa.id)
            return (
              <div key={etapa.id} style={{ minWidth:195, background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:10, padding:12, flexShrink:0 }}>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:6, fontSize:11, fontWeight:500, color:etapa.cor }}>
                    <div style={{ width:7, height:7, borderRadius:'50%', background:etapa.cor }}></div>
                    {etapa.label}
                  </div>
                  <span style={{ fontSize:10, background:'var(--bg4)', borderRadius:8, padding:'1px 6px', color:'var(--text3)' }}>{ep.length}</span>
                </div>
                {ep.map(p => (
                  <div key={p.id} onClick={() => setSelected(p)} style={{ background:'var(--bg3)', border:`1px solid ${selected?.id===p.id?'var(--accent)':'var(--border2)'}`, borderRadius:8, padding:10, marginBottom:8, cursor:'pointer', transition:'all 0.15s' }}>
                    <div style={{ fontSize:10, color:'var(--text3)', marginBottom:3 }}>{p.clientes?.nome || '—'}</div>
                    <div style={{ fontSize:12, fontWeight:500, color:'var(--text1)', marginBottom:5 }}>{p.nome}</div>
                    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:5 }}>
                      <span style={{ fontSize:10, padding:'2px 6px', borderRadius:4, background:'rgba(79,124,255,0.15)', color:'var(--accent)', fontWeight:500 }}>{p.servico}</span>
                      {p.prazo && <span style={{ fontSize:10, color:'var(--text3)' }}>{new Date(p.prazo).toLocaleDateString('pt-BR')}</span>}
                    </div>
                    <div style={{ height:3, background:'var(--bg4)', borderRadius:2, overflow:'hidden' }}>
                      <div style={{ height:'100%', width:`${p.progresso||0}%`, background:'var(--accent)', borderRadius:2 }}></div>
                    </div>
                    <div style={{ fontSize:10, color:'var(--text3)', marginTop:3, textAlign:'right' }}>{p.progresso||0}%</div>
                  </div>
                ))}
                <button onClick={() => { setForm(f => ({...f, etapa:etapa.id})); setModal(true) }}
                  style={{ width:'100%', border:'1px dashed var(--border2)', borderRadius:7, padding:'7px', fontSize:11, color:'var(--text3)', background:'none', cursor:'pointer' }}>
                  + Adicionar
                </button>
              </div>
            )
          })}
        </div>
      </div>

      {/* Painel lateral */}
      {selected && (
        <div style={{ width:270, background:'var(--bg1)', borderLeft:'1px solid var(--border)', padding:16, overflowY:'auto', flexShrink:0 }}>
          <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:14 }}>
            <div style={{ fontFamily:'var(--font-display)', fontSize:14, fontWeight:600, flex:1, lineHeight:1.4 }}>{selected.nome}</div>
            <button onClick={() => setSelected(null)} style={{ background:'none', border:'none', color:'var(--text3)', cursor:'pointer', fontSize:16, lineHeight:1 }}>✕</button>
          </div>
          <div style={{ fontSize:10, color:'var(--text3)', marginBottom:5, letterSpacing:'0.5px' }}>CLIENTE</div>
          <div style={{ fontSize:12, color:'var(--text2)', marginBottom:12 }}>{selected.clientes?.nome || '—'}</div>
          <div style={{ fontSize:10, color:'var(--text3)', marginBottom:5, letterSpacing:'0.5px' }}>SERVIÇO</div>
          <div style={{ fontSize:12, color:'var(--text2)', marginBottom:12 }}>{selected.servico}</div>
          <div style={{ fontSize:10, color:'var(--text3)', marginBottom:5, letterSpacing:'0.5px' }}>PROGRESSO</div>
          <div style={{ height:5, background:'var(--bg4)', borderRadius:3, overflow:'hidden', marginBottom:4 }}>
            <div style={{ height:'100%', width:`${selected.progresso||0}%`, background:'var(--accent)', borderRadius:3 }}></div>
          </div>
          <div style={{ fontSize:11, color:'var(--text3)', marginBottom:14 }}>{selected.progresso||0}% concluído</div>

          <div style={{ fontSize:10, color:'var(--text3)', marginBottom:8, letterSpacing:'0.5px' }}>MOVER PARA</div>
          <div style={{ display:'flex', flexWrap:'wrap', gap:5, marginBottom:16 }}>
            {ETAPAS.filter(e => e.id !== selected.etapa).map(e => (
              <button key={e.id} onClick={() => mover(selected.id, e.id)}
                style={{ fontSize:10, padding:'3px 8px', borderRadius:5, background:'var(--bg3)', border:'1px solid var(--border2)', color:'var(--text2)', cursor:'pointer' }}>
                → {e.label}
              </button>
            ))}
          </div>

          <div style={{ fontSize:10, color:'var(--text3)', marginBottom:8, letterSpacing:'0.5px' }}>TAREFAS</div>
          {(selected.tarefas || []).map(t => (
            <div key={t.id} style={{ display:'flex', alignItems:'center', gap:8, padding:'5px 0', borderBottom:'1px solid var(--border)' }}>
              <div onClick={() => toggleTarefa(t.id, !t.concluida, selected.id)}
                style={{ width:14, height:14, borderRadius:3, border:`1px solid ${t.concluida?'var(--green)':'var(--border2)'}`, background:t.concluida?'var(--green)':'transparent', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', flexShrink:0 }}>
                {t.concluida && <span style={{ color:'#fff', fontSize:8, lineHeight:1 }}>✓</span>}
              </div>
              <span style={{ fontSize:11, color:t.concluida?'var(--text3)':'var(--text2)', textDecoration:t.concluida?'line-through':'none', flex:1 }}>{t.titulo}</span>
            </div>
          ))}
          <div style={{ display:'flex', gap:6, marginTop:10 }}>
            <input value={novaTarefa} onChange={e => setNovaTarefa(e.target.value)} onKeyDown={e => e.key==='Enter'&&addTarefa(selected.id)} placeholder="Nova tarefa..." style={{ flex:1, background:'var(--bg3)', border:'1px solid var(--border2)', borderRadius:6, padding:'6px 10px', color:'var(--text1)', fontSize:11, outline:'none' }}/>
            <button onClick={() => addTarefa(selected.id)} style={{ background:'var(--accent)', border:'none', borderRadius:6, padding:'6px 10px', fontSize:11, color:'#fff', cursor:'pointer' }}>+</button>
          </div>
        </div>
      )}

      {/* Modal novo projeto */}
      {modal && (
        <div className="modal-overlay">
          <div style={{ background:'var(--bg2)', border:'1px solid var(--border2)', borderRadius:12, padding:24, width:380 }}>
            <div style={{ fontFamily:'var(--font-display)', fontSize:15, fontWeight:600, marginBottom:18 }}>Novo Projeto</div>
            <div style={{ display:'flex', flexDirection:'column', gap:10, marginBottom:16 }}>
              <div><label style={lbl}>NOME DO PROJETO *</label><input style={inp} value={form.nome} onChange={e => setForm({...form, nome:e.target.value})} placeholder="Ex: Site institucional"/></div>
              <div><label style={lbl}>CLIENTE</label>
                <select style={inp} value={form.cliente_id} onChange={e => setForm({...form, cliente_id:e.target.value})}>
                  <option value="">Selecione...</option>
                  {clientes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                </select>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                <div><label style={lbl}>SERVIÇO</label>
                  <select style={inp} value={form.servico} onChange={e => setForm({...form, servico:e.target.value})}>
                    {SERVICOS.map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <div><label style={lbl}>ETAPA</label>
                  <select style={inp} value={form.etapa} onChange={e => setForm({...form, etapa:e.target.value})}>
                    {ETAPAS.map(e => <option key={e.id} value={e.id}>{e.label}</option>)}
                  </select>
                </div>
              </div>
              <div><label style={lbl}>PRAZO</label><input style={inp} type="date" value={form.prazo} onChange={e => setForm({...form, prazo:e.target.value})}/></div>
            </div>
            <div style={{ display:'flex', gap:8, justifyContent:'flex-end' }}>
              <button onClick={() => setModal(false)} style={{ background:'none', border:'1px solid var(--border2)', borderRadius:7, padding:'7px 16px', fontSize:12, color:'var(--text2)', cursor:'pointer' }}>Cancelar</button>
              <button onClick={handleSave} disabled={!form.nome || saving} style={{ background:'var(--accent)', border:'none', borderRadius:7, padding:'7px 16px', fontSize:12, fontWeight:500, color:'#fff', cursor:'pointer', opacity:(!form.nome||saving)?0.6:1 }}>
                {saving ? 'Salvando...' : 'Criar Projeto'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
