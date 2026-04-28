import React, { useEffect, useState } from 'react'
import { pipelineAPI, clientesAPI } from '../lib/supabase.js'

const ETAPAS = [
  { id:'prospeccao', label:'Prospecção', cor:'#5C6478' },
  { id:'qualificacao', label:'Qualificação', cor:'#4F7CFF' },
  { id:'proposta', label:'Proposta', cor:'#F5A623' },
  { id:'fechado', label:'Fechado', cor:'#22C97A' },
  { id:'perdido', label:'Perdido', cor:'#FF5B5B' },
]
const SERVICOS = ['Tráfego Pago','Site','Landing Page','Agente IA','App Mobile','SaaS','Consultoria','Redes Sociais']
const TAG_COR = { 'Tráfego Pago':'tag-amber', 'Agente IA':'tag-blue', 'Site':'tag-purple', 'App Mobile':'tag-blue', 'SaaS':'tag-amber', 'Consultoria':'tag-green', default:'tag-blue' }

export default function Pipeline() {
  const [deals, setDeals] = useState([])
  const [clientes, setClientes] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({ nome:'', empresa:'', cliente_id:'', servico:'Tráfego Pago', etapa:'prospeccao', valor:'0' })
  const [saving, setSaving] = useState(false)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const [{ data: d }, { data: c }] = await Promise.all([pipelineAPI.listar(), clientesAPI.listar()])
    setDeals(d || [])
    setClientes(c || [])
    setLoading(false)
  }

  async function handleSave() {
    setSaving(true)
    await pipelineAPI.criar({ ...form, valor: parseFloat(form.valor) || 0, tag_label: form.servico, tag: 'tag-blue' })
    setModal(false)
    setForm({ nome:'', empresa:'', cliente_id:'', servico:'Tráfego Pago', etapa:'prospeccao', valor:'0' })
    await load()
    setSaving(false)
  }

  async function mover(id, etapa) {
    await pipelineAPI.moverEtapa(id, etapa)
    await load()
  }

  const inp = { width:'100%', background:'var(--bg3)', border:'1px solid var(--border2)', borderRadius:7, padding:'8px 12px', color:'var(--text1)', fontSize:12, outline:'none', fontFamily:'DM Sans, sans-serif' }
  const lbl = { fontSize:11, color:'var(--text3)', display:'block', marginBottom:4, letterSpacing:'0.3px' }

  return (
    <div>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
        <h1 style={{ fontFamily:'Syne, sans-serif', fontSize:20, fontWeight:700 }}>Pipeline de Vendas</h1>
        <button onClick={() => setModal(true)} style={{ background:'var(--accent)', border:'none', borderRadius:7, padding:'8px 16px', fontSize:12, fontWeight:500, color:'#fff', cursor:'pointer' }}>+ Novo Deal</button>
      </div>

      {/* Totalizadores */}
      <div style={{ display:'flex', gap:8, marginBottom:16 }}>
        {ETAPAS.map(e => {
          const etapaDeals = deals.filter(d => d.etapa === e.id)
          const total = etapaDeals.reduce((a, d) => a + Number(d.valor), 0)
          return (
            <div key={e.id} style={{ background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:8, padding:'8px 12px', flex:1 }}>
              <div style={{ fontSize:10, color:e.cor, fontWeight:500, letterSpacing:'0.3px', marginBottom:2 }}>{e.label.toUpperCase()}</div>
              <div style={{ fontFamily:'Syne, sans-serif', fontSize:14, fontWeight:600 }}>{etapaDeals.length} deals</div>
              {total > 0 && <div style={{ fontSize:10, color:'var(--text3)' }}>R$ {total.toLocaleString('pt-BR')}</div>}
            </div>
          )
        })}
      </div>

      {/* Kanban */}
      <div style={{ display:'flex', gap:10, overflowX:'auto', alignItems:'flex-start', paddingBottom:8 }}>
        {ETAPAS.map(etapa => {
          const etapaDeals = deals.filter(d => d.etapa === etapa.id)
          return (
            <div key={etapa.id} style={{ minWidth:200, background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:10, padding:12, flexShrink:0 }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
                <div style={{ display:'flex', alignItems:'center', gap:6, fontSize:12, fontWeight:500, color:etapa.cor }}>
                  <div style={{ width:7, height:7, borderRadius:'50%', background:etapa.cor }}></div>
                  {etapa.label}
                </div>
                <span style={{ fontSize:10, background:'var(--bg4)', borderRadius:8, padding:'1px 6px', color:'var(--text3)' }}>{etapaDeals.length}</span>
              </div>

              {loading && <div style={{ fontSize:11, color:'var(--text3)', padding:'8px 0' }}>Carregando...</div>}

              {etapaDeals.map(deal => (
                <div key={deal.id} style={{ background:'var(--bg3)', border:'1px solid var(--border2)', borderRadius:8, padding:10, marginBottom:8, cursor:'pointer' }}>
                  <div style={{ fontSize:12, fontWeight:500, color:'var(--text1)', marginBottom:2 }}>{deal.nome}</div>
                  <div style={{ fontSize:11, color:'var(--text3)', marginBottom:6 }}>{deal.empresa || deal.clientes?.nome || '—'}</div>
                  <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:6 }}>
                    <span style={{ fontSize:12, fontWeight:600, color:'var(--green)', fontFamily:'Syne, sans-serif' }}>R$ {Number(deal.valor).toLocaleString('pt-BR')}</span>
                    <span style={{ fontSize:10, padding:'2px 6px', borderRadius:4, background:'rgba(79,124,255,0.15)', color:'var(--accent)', fontWeight:500 }}>{deal.tag_label || deal.servico}</span>
                  </div>
                  {/* Mover etapa */}
                  <div style={{ display:'flex', gap:4, flexWrap:'wrap' }}>
                    {ETAPAS.filter(e => e.id !== etapa.id).map(e => (
                      <button key={e.id} onClick={() => mover(deal.id, e.id)}
                        style={{ fontSize:9, padding:'2px 6px', borderRadius:4, background:'var(--bg4)', border:'1px solid var(--border2)', color:'var(--text3)', cursor:'pointer' }}>
                        → {e.label}
                      </button>
                    ))}
                  </div>
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

      {/* Modal */}
      {modal && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.7)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000 }}>
          <div style={{ background:'var(--bg2)', border:'1px solid var(--border2)', borderRadius:12, padding:24, width:400 }}>
            <div style={{ fontFamily:'Syne, sans-serif', fontSize:15, fontWeight:600, marginBottom:18 }}>Novo Deal</div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:12 }}>
              <div style={{ gridColumn:'1/-1' }}><label style={lbl}>NOME DO NEGÓCIO *</label><input style={inp} value={form.nome} onChange={e => setForm({...form, nome:e.target.value})} placeholder="Ex: Site para Clínica X"/></div>
              <div><label style={lbl}>EMPRESA</label><input style={inp} value={form.empresa} onChange={e => setForm({...form, empresa:e.target.value})} placeholder="Nome da empresa"/></div>
              <div><label style={lbl}>CLIENTE (opcional)</label>
                <select style={inp} value={form.cliente_id} onChange={e => setForm({...form, cliente_id:e.target.value})}>
                  <option value="">Selecione...</option>
                  {clientes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                </select>
              </div>
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
              <div style={{ gridColumn:'1/-1' }}><label style={lbl}>VALOR (R$)</label><input style={inp} type="number" value={form.valor} onChange={e => setForm({...form, valor:e.target.value})} placeholder="0"/></div>
            </div>
            <div style={{ display:'flex', gap:8, justifyContent:'flex-end' }}>
              <button onClick={() => setModal(false)} style={{ background:'none', border:'1px solid var(--border2)', borderRadius:7, padding:'7px 16px', fontSize:12, color:'var(--text2)', cursor:'pointer' }}>Cancelar</button>
              <button onClick={handleSave} disabled={!form.nome || saving} style={{ background:'var(--accent)', border:'none', borderRadius:7, padding:'7px 16px', fontSize:12, fontWeight:500, color:'#fff', cursor:'pointer', opacity:(!form.nome||saving)?0.6:1 }}>
                {saving ? 'Salvando...' : 'Salvar Deal'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
