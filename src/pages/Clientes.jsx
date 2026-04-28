import React, { useEffect, useState } from 'react'
import { clientesAPI } from '../lib/supabase.js'

const STATUS_MAP = { ativo:'Ativo', prospect:'Prospect', qualificacao:'Qualificação', proposta:'Proposta', pausado:'Pausado', perdido:'Perdido' }
const STATUS_COR = { ativo:'var(--green)', prospect:'var(--accent)', qualificacao:'var(--accent)', proposta:'var(--amber)', pausado:'var(--amber)', perdido:'var(--red)' }
const CORES = ['#4F7CFF','#7B5CFF','#22C97A','#F5A623','#FF5B5B','#A78BFA','#34D399']

export default function Clientes() {
  const [clientes, setClientes] = useState([])
  const [busca, setBusca] = useState('')
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({ nome:'', empresa:'', segmento:'', contato:'', whatsapp:'', email:'', status:'prospect', mrr:'0' })
  const [saving, setSaving] = useState(false)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const { data } = await clientesAPI.listar()
    setClientes(data || [])
    setLoading(false)
  }

  async function handleSave() {
    setSaving(true)
    const iniciais = form.nome.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
    const cor = CORES[Math.floor(Math.random() * CORES.length)]
    await clientesAPI.criar({ ...form, mrr: parseFloat(form.mrr) || 0, iniciais, cor })
    setModal(false)
    setForm({ nome:'', empresa:'', segmento:'', contato:'', whatsapp:'', email:'', status:'prospect', mrr:'0' })
    await load()
    setSaving(false)
  }

  async function handleDelete(id) {
    if (!confirm('Remover este cliente?')) return
    await clientesAPI.deletar(id)
    await load()
  }

  const filtrados = clientes.filter(c =>
    c.nome?.toLowerCase().includes(busca.toLowerCase()) ||
    c.segmento?.toLowerCase().includes(busca.toLowerCase()) ||
    c.status?.toLowerCase().includes(busca.toLowerCase())
  )

  const inp = { width:'100%', background:'var(--bg3)', border:'1px solid var(--border2)', borderRadius:7, padding:'8px 12px', color:'var(--text1)', fontSize:12, outline:'none', fontFamily:'DM Sans, sans-serif' }
  const lbl = { fontSize:11, color:'var(--text3)', display:'block', marginBottom:4, letterSpacing:'0.3px' }

  return (
    <div>
      <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:20 }}>
        <h1 style={{ fontFamily:'Syne, sans-serif', fontSize:20, fontWeight:700, flex:1 }}>Clientes</h1>
        <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar..." style={{ ...inp, width:220 }} />
        <button onClick={() => setModal(true)} style={{ background:'var(--accent)', border:'none', borderRadius:7, padding:'8px 16px', fontSize:12, fontWeight:500, color:'#fff', cursor:'pointer', whiteSpace:'nowrap' }}>+ Novo Cliente</button>
      </div>

      <div style={{ background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:10, overflow:'hidden' }}>
        <table style={{ width:'100%', borderCollapse:'collapse' }}>
          <thead>
            <tr>
              {['Cliente','Segmento','Status','MRR','Contato','Ações'].map(h => (
                <th key={h} style={{ fontSize:10, color:'var(--text3)', textAlign:'left', padding:'8px 12px', borderBottom:'1px solid var(--border)', fontWeight:500, letterSpacing:'0.3px' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={6} style={{ padding:20, color:'var(--text3)', fontSize:12 }}>Carregando...</td></tr>}
            {!loading && filtrados.length === 0 && (
              <tr><td colSpan={6} style={{ padding:20, color:'var(--text3)', fontSize:12 }}>Nenhum cliente encontrado. Crie o primeiro!</td></tr>
            )}
            {filtrados.map(c => (
              <tr key={c.id} style={{ borderBottom:'1px solid var(--border)' }}>
                <td style={{ padding:'10px 12px' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                    <div style={{ width:26, height:26, borderRadius:6, background:c.cor || '#4F7CFF', display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, fontWeight:600, color:'#fff', flexShrink:0 }}>{c.iniciais || '??'}</div>
                    <span style={{ color:'var(--text1)', fontWeight:500, fontSize:12 }}>{c.nome}</span>
                  </div>
                </td>
                <td style={{ fontSize:12, color:'var(--text2)', padding:'10px 12px' }}>{c.segmento || '—'}</td>
                <td style={{ padding:'10px 12px' }}>
                  <span style={{ fontSize:10, padding:'2px 7px', borderRadius:4, fontWeight:500, background:`${STATUS_COR[c.status]}22`, color:STATUS_COR[c.status] }}>{STATUS_MAP[c.status] || c.status}</span>
                </td>
                <td style={{ fontSize:12, color:'var(--green)', fontWeight:500, fontFamily:'Syne, sans-serif', padding:'10px 12px' }}>
                  {c.mrr > 0 ? `R$ ${Number(c.mrr).toLocaleString('pt-BR')}` : '—'}
                </td>
                <td style={{ fontSize:11, color:'var(--text3)', padding:'10px 12px' }}>{c.contato || '—'}</td>
                <td style={{ padding:'10px 12px' }}>
                  <button onClick={() => handleDelete(c.id)} style={{ background:'none', border:'1px solid var(--border2)', borderRadius:5, padding:'3px 8px', fontSize:10, color:'var(--red)', cursor:'pointer' }}>Remover</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {modal && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.7)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000 }}>
          <div style={{ background:'var(--bg2)', border:'1px solid var(--border2)', borderRadius:12, padding:24, width:420 }}>
            <div style={{ fontFamily:'Syne, sans-serif', fontSize:15, fontWeight:600, marginBottom:18 }}>Novo Cliente</div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:12 }}>
              <div><label style={lbl}>NOME *</label><input style={inp} value={form.nome} onChange={e => setForm({...form, nome:e.target.value})} placeholder="Nome do cliente"/></div>
              <div><label style={lbl}>EMPRESA</label><input style={inp} value={form.empresa} onChange={e => setForm({...form, empresa:e.target.value})} placeholder="Nome da empresa"/></div>
              <div><label style={lbl}>SEGMENTO</label>
                <select style={inp} value={form.segmento} onChange={e => setForm({...form, segmento:e.target.value})}>
                  <option value="">Selecione...</option>
                  {['Saúde','Educação','Varejo','Alimentação','Automotivo','Jurídico','Beleza','Construção','Turismo','B2B','Outro'].map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div><label style={lbl}>STATUS</label>
                <select style={inp} value={form.status} onChange={e => setForm({...form, status:e.target.value})}>
                  {Object.entries(STATUS_MAP).map(([k,v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div><label style={lbl}>CONTATO</label><input style={inp} value={form.contato} onChange={e => setForm({...form, contato:e.target.value})} placeholder="Nome do responsável"/></div>
              <div><label style={lbl}>WHATSAPP</label><input style={inp} value={form.whatsapp} onChange={e => setForm({...form, whatsapp:e.target.value})} placeholder="(81) 99999-9999"/></div>
              <div><label style={lbl}>E-MAIL</label><input style={inp} value={form.email} onChange={e => setForm({...form, email:e.target.value})} placeholder="email@empresa.com"/></div>
              <div><label style={lbl}>MRR (R$)</label><input style={inp} type="number" value={form.mrr} onChange={e => setForm({...form, mrr:e.target.value})} placeholder="0"/></div>
            </div>
            <div style={{ display:'flex', gap:8, justifyContent:'flex-end', marginTop:4 }}>
              <button onClick={() => setModal(false)} style={{ background:'none', border:'1px solid var(--border2)', borderRadius:7, padding:'7px 16px', fontSize:12, color:'var(--text2)', cursor:'pointer' }}>Cancelar</button>
              <button onClick={handleSave} disabled={!form.nome || saving} style={{ background:'var(--accent)', border:'none', borderRadius:7, padding:'7px 16px', fontSize:12, fontWeight:500, color:'#fff', cursor:'pointer', opacity:(!form.nome||saving)?0.6:1 }}>
                {saving ? 'Salvando...' : 'Salvar Cliente'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
