import { toast } from '../lib/toast.js'
import { supabase } from '../lib/supabase.js'
import React, { useEffect, useState } from 'react'
import { clientesAPI } from '../lib/supabase.js'

const STATUS_MAP = {
  ativo:'Ativo', prospect:'Prospect', qualificacao:'Qualificação',
  proposta:'Proposta', pausado:'Pausado', perdido:'Perdido',
}
const STATUS_COR = {
  ativo:'var(--green)', prospect:'var(--accent)', qualificacao:'var(--accent)',
  proposta:'var(--amber)', pausado:'var(--amber)', perdido:'var(--red)',
}
const STATUS_COMERCIAL = [
  'Novo Lead','Em Negociação','Reunião Realizada',
  'Proposta Enviada','Contrato Fechado','Perdido',
]
const STATUS_COM_COR = {
  'Novo Lead':'var(--accent)',
  'Em Negociação':'var(--amber)',
  'Reunião Realizada':'var(--accent)',
  'Proposta Enviada':'var(--amber)',
  'Contrato Fechado':'var(--green)',
  'Perdido':'var(--red)',
}
const CORES = ['#4F7CFF','#7B5CFF','#22C97A','#F5A623','#FF5B5B','#A78BFA','#34D399']
const SEGMENTOS = [
  'Saúde','Educação','Varejo','Alimentação','Automotivo','Jurídico',
  'Beleza & Estética','Construção Civil','Turismo','B2B / Indústria',
  'Pet','Esporte','Tecnologia','Serviços','Outro',
]
const ESTADOS_BR = [
  'AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG',
  'PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO',
]
const FORM_INICIAL = {
  nome:'', empresa:'', segmento:'', nicho:'', contato:'',
  whatsapp:'', email:'', status:'prospect',
  status_comercial:'Novo Lead', icp:0, mrr:'0',
  cnpj:'', canal_vendas:'',
  instagram:'', google_maps:'', website:'',
  social_media:'', meta_ads:'Sem Ads', google_ads:'Sem Ads',
  cidade:'', estado:'', observacoes:'',
}

function Estrelas({ value, onChange }) {
  return (
    <div style={{ display:'flex', gap:4 }}>
      {[1,2,3,4,5].map(n => (
        <span key={n} onClick={() => onChange(value === n ? 0 : n)}
          style={{ fontSize:22, cursor:'pointer', color: n <= value ? 'var(--amber)' : 'var(--border2)', userSelect:'none' }}>
          ★
        </span>
      ))}
    </div>
  )
}

export default function Clientes() {
  const [clientes, setClientes]     = useState([])
  const [busca, setBusca]           = useState('')
  const [loading, setLoading]       = useState(true)
  const [modal, setModal]           = useState(false)
  const [form, setForm]             = useState(FORM_INICIAL)
  const [saving, setSaving]         = useState(false)
  const [abaForm, setAbaForm]       = useState('basico')
  const [detalhe, setDetalhe]       = useState(null)
  const [abaDetalhe, setAbaDetalhe] = useState('info')
  const [historico, setHistorico]   = useState([])
  const [loadingHist, setLoadingHist] = useState(false)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const { data } = await clientesAPI.listar()
    setClientes(data || [])
    setLoading(false)
  }

  async function abrirDetalhe(c) {
    setDetalhe(c)
    setAbaDetalhe('info')
    loadHistorico(c.id)
  }

  async function loadHistorico(clienteId) {
    setLoadingHist(true)
    const [{ data: deals }, { data: projetos }, { data: propostas }] = await Promise.all([
      supabase.from('deals').select('id, nome, etapa, valor, criado_em').eq('cliente_id', clienteId).order('criado_em', { ascending: false }),
      supabase.from('projetos').select('id, nome, etapa, criado_em').eq('cliente_id', clienteId).order('criado_em', { ascending: false }),
      supabase.from('propostas').select('id, nome, criado_em').eq('cliente_id', clienteId).order('criado_em', { ascending: false }),
    ])
    const eventos = [
      ...(deals || []).map(d => ({ tipo: 'deal', label: d.nome, sub: `Deal · ${d.etapa}`, valor: d.valor, data: d.criado_em, cor: 'var(--sky)' })),
      ...(projetos || []).map(p => ({ tipo: 'projeto', label: p.nome, sub: `Projeto · ${p.etapa}`, data: p.criado_em, cor: 'var(--amber)' })),
      ...(propostas || []).map(p => ({ tipo: 'proposta', label: p.nome || 'Proposta gerada', sub: 'Proposta IA', data: p.criado_em, cor: 'var(--accent)' })),
    ].sort((a, b) => new Date(b.data) - new Date(a.data))
    setHistorico(eventos)
    setLoadingHist(false)
  }

  async function handleSave() {
    setSaving(true)
    const iniciais = form.nome.split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase()
    const cor = CORES[Math.floor(Math.random() * CORES.length)]
    const { error } = await clientesAPI.criar({ ...form, mrr: parseFloat(form.mrr)||0, iniciais, cor })
    setSaving(false)
    if (error) { toast.error('Erro ao salvar cliente'); return }
    toast.success('Cliente cadastrado')
    setModal(false)
    setForm(FORM_INICIAL)
    setAbaForm('basico')
    await load()
  }

  async function handleDelete(id) {
    if (!confirm('Remover este cliente?')) return
    const { error } = await clientesAPI.deletar(id)
    if (error) { toast.error('Erro ao remover cliente'); return }
    toast.success('Cliente removido')
    await load()
  }

  const filtrados = clientes.filter(c =>
    c.nome?.toLowerCase().includes(busca.toLowerCase()) ||
    c.segmento?.toLowerCase().includes(busca.toLowerCase()) ||
    c.nicho?.toLowerCase().includes(busca.toLowerCase()) ||
    c.cidade?.toLowerCase().includes(busca.toLowerCase()) ||
    c.status_comercial?.toLowerCase().includes(busca.toLowerCase())
  )

  const inp = {
    width:'100%', background:'var(--bg3)', border:'1px solid var(--border2)',
    borderRadius:7, padding:'8px 12px', color:'var(--text1)',
    fontSize:12, outline:'none', fontFamily:'DM Sans, sans-serif',
  }
  const lbl   = { fontSize:11, color:'var(--text3)', display:'block', marginBottom:4, letterSpacing:'0.3px' }
  const grid2 = { display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:12 }
  const grid3 = { display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:12, marginBottom:12 }

  return (
    <div>
      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:20 }}>
        <h1 className="page-title">Clientes</h1>
        <input value={busca} onChange={e => setBusca(e.target.value)}
          placeholder="Buscar nome, nicho, cidade, status..."
          style={{ ...inp, width:260 }} />
        <button onClick={() => { setModal(true); setAbaForm('basico') }}
          className="btn btn-primary" style={{ whiteSpace:'nowrap' }}>
          + Novo Cliente
        </button>
      </div>

      {/* Tabela */}
      <div style={{ background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:10, overflow:'hidden' }}>
        <table style={{ width:'100%', borderCollapse:'collapse' }}>
          <thead>
            <tr>
              {['Cliente','Nicho / Segmento','Status Comercial','ICP','WhatsApp','Cidade','Ação'].map(h => (
                <th key={h} style={{ fontSize:10, color:'var(--text3)', textAlign:'left', padding:'8px 12px', borderBottom:'1px solid var(--border)', fontWeight:500, letterSpacing:'0.3px' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={7} style={{ padding:20, color:'var(--text3)', fontSize:12 }}>Carregando...</td></tr>}
            {!loading && filtrados.length === 0 && (
              <tr><td colSpan={7} style={{ padding:20, color:'var(--text3)', fontSize:12 }}>Nenhum cliente encontrado.</td></tr>
            )}
            {filtrados.map(c => (
              <tr key={c.id} style={{ borderBottom:'1px solid var(--border)', cursor:'pointer' }} onClick={() => abrirDetalhe(c)}>
                <td style={{ padding:'10px 12px' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                    <div style={{ width:26, height:26, borderRadius:6, background:c.cor||'#4F7CFF', display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, fontWeight:600, color:'#fff', flexShrink:0 }}>
                      {c.iniciais||'??'}
                    </div>
                    <div>
                      <div style={{ color:'var(--text1)', fontWeight:500, fontSize:12 }}>{c.nome}</div>
                      {c.contato && <div style={{ fontSize:10, color:'var(--text3)' }}>{c.contato}</div>}
                    </div>
                  </div>
                </td>
                <td style={{ fontSize:11, color:'var(--text2)', padding:'10px 12px' }}>
                  {c.nicho || c.segmento || '—'}
                  {c.nicho && c.segmento && <div style={{ fontSize:10, color:'var(--text3)' }}>{c.segmento}</div>}
                </td>
                <td style={{ padding:'10px 12px' }}>
                  <span style={{ fontSize:10, padding:'2px 7px', borderRadius:4, fontWeight:500, background:`${STATUS_COM_COR[c.status_comercial]||'var(--accent)'}22`, color:STATUS_COM_COR[c.status_comercial]||'var(--accent)' }}>
                    {c.status_comercial || 'Novo Lead'}
                  </span>
                </td>
                <td style={{ padding:'10px 12px' }}>
                  <span style={{ color:'var(--amber)', fontSize:14, letterSpacing:1 }}>
                    {'★'.repeat(c.icp||0)}{'☆'.repeat(5-(c.icp||0))}
                  </span>
                </td>
                <td style={{ fontSize:11, color:'var(--text3)', padding:'10px 12px' }}>{c.whatsapp||'—'}</td>
                <td style={{ fontSize:11, color:'var(--text3)', padding:'10px 12px' }}>
                  {c.cidade ? `${c.cidade}${c.estado?', '+c.estado:''}` : '—'}
                </td>
                <td style={{ padding:'10px 12px' }} onClick={e => e.stopPropagation()}>
                  <button onClick={() => handleDelete(c.id)}
                    style={{ background:'none', border:'1px solid var(--border2)', borderRadius:5, padding:'3px 8px', fontSize:10, color:'var(--red)', cursor:'pointer' }}>
                    Remover
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Painel de detalhe */}
      {detalhe && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.65)', zIndex:999, display:'flex', alignItems:'center', justifyContent:'center' }}
          onClick={() => setDetalhe(null)}>
          <div style={{ background:'var(--bg2)', border:'1px solid var(--border2)', borderRadius:12, padding:24, width:520, maxHeight:'88vh', overflowY:'auto' }}
            onClick={e => e.stopPropagation()}>
            {/* Cabeçalho */}
            <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:18 }}>
              <div style={{ width:42, height:42, borderRadius:9, background:detalhe.cor||'#4F7CFF', display:'flex', alignItems:'center', justifyContent:'center', fontSize:15, fontWeight:700, color:'#fff' }}>
                {detalhe.iniciais}
              </div>
              <div style={{ flex:1 }}>
                <div style={{ fontFamily:'var(--font-display)', fontSize:16, fontWeight:600, color:'var(--text1)' }}>{detalhe.nome}</div>
                {detalhe.empresa && detalhe.empresa !== detalhe.nome && <div style={{ fontSize:11, color:'var(--text3)' }}>{detalhe.empresa}</div>}
              </div>
              <div style={{ display:'flex', gap:6, alignItems:'center' }}>
                <span style={{ fontSize:10, padding:'3px 8px', borderRadius:4, fontWeight:500, background:`${STATUS_COM_COR[detalhe.status_comercial]||'var(--accent)'}22`, color:STATUS_COM_COR[detalhe.status_comercial]||'var(--accent)' }}>
                  {detalhe.status_comercial||'Novo Lead'}
                </span>
                <span style={{ fontSize:13, color:'var(--amber)', letterSpacing:1 }}>
                  {'★'.repeat(detalhe.icp||0)}{'☆'.repeat(5-(detalhe.icp||0))}
                </span>
                <button onClick={() => setDetalhe(null)} style={{ background:'none', border:'none', color:'var(--text3)', cursor:'pointer', fontSize:18, marginLeft:4 }}>✕</button>
              </div>
            </div>

            {/* Abas Info / Histórico */}
            <div style={{ display:'flex', gap:2, marginBottom:16, borderBottom:'1px solid var(--border)' }}>
              {[['info','Informações'],['historico','Histórico']].map(([id, label]) => (
                <button key={id} onClick={() => setAbaDetalhe(id)}
                  style={{ background:'none', border:'none', borderBottom: abaDetalhe===id ? '2px solid var(--accent)' : '2px solid transparent', padding:'6px 14px', fontSize:12, fontWeight:500, color: abaDetalhe===id ? 'var(--accent)' : 'var(--text3)', cursor:'pointer', marginBottom:-1, transition:'color 0.15s' }}>
                  {label}
                </button>
              ))}
            </div>

            {/* Aba Histórico */}
            {abaDetalhe === 'historico' && (
              <div>
                {loadingHist && <div className="skeleton" style={{ height: 60, marginBottom: 8 }} />}
                {!loadingHist && historico.length === 0 && (
                  <div style={{ fontSize:12, color:'var(--text3)', padding:'20px 0', textAlign:'center' }}>
                    Nenhuma atividade registrada para este cliente ainda.
                  </div>
                )}
                {historico.map((ev, i) => (
                  <div key={i} style={{ display:'flex', gap:12, padding:'10px 0', borderBottom:'1px solid var(--border)' }}>
                    <div style={{ width:28, height:28, borderRadius:7, background:`${ev.cor}22`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                      <div style={{ width:7, height:7, borderRadius:'50%', background:ev.cor }} />
                    </div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:12, color:'var(--text1)', fontWeight:500 }}>{ev.label}</div>
                      <div style={{ fontSize:11, color:'var(--text3)', marginTop:2 }}>{ev.sub}</div>
                    </div>
                    <div style={{ textAlign:'right', flexShrink:0 }}>
                      {ev.valor > 0 && <div style={{ fontSize:11, fontWeight:600, color:'var(--green)', fontFamily:'var(--font-mono)' }}>R$ {Number(ev.valor).toLocaleString('pt-BR')}</div>}
                      <div style={{ fontSize:10, color:'var(--text3)' }}>{new Date(ev.data).toLocaleDateString('pt-BR')}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Aba Informações */}
            {abaDetalhe === 'info' && (
            <div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:14 }}>
              {[
                ['Contato', detalhe.contato],
                ['WhatsApp', detalhe.whatsapp],
                ['E-mail', detalhe.email],
                ['CNPJ', detalhe.cnpj],
                ['Canal de Vendas', detalhe.canal_vendas],
                ['Segmento', detalhe.segmento],
                ['Nicho', detalhe.nicho],
                ['Localização', detalhe.cidade ? `${detalhe.cidade}${detalhe.estado?', '+detalhe.estado:''}` : null],
                ['MRR', detalhe.mrr > 0 ? `R$ ${Number(detalhe.mrr).toLocaleString('pt-BR')}` : null],
                ['Status CRM', STATUS_MAP[detalhe.status] || detalhe.status],
              ].filter(([,v]) => v).map(([label, val]) => (
                <div key={label} style={{ background:'var(--bg3)', border:'1px solid var(--border)', borderRadius:7, padding:'8px 12px' }}>
                  <div style={{ fontSize:10, color:'var(--text3)', marginBottom:2, letterSpacing:'0.3px' }}>{label.toUpperCase()}</div>
                  <div style={{ fontSize:12, color:'var(--text1)', fontWeight:500 }}>{val}</div>
                </div>
              ))}
            </div>

            {/* Marketing Digital */}
            {(detalhe.meta_ads || detalhe.google_ads || detalhe.social_media) && (
              <div style={{ marginBottom:14 }}>
                <div style={{ fontSize:10, color:'var(--text3)', marginBottom:8, letterSpacing:'0.3px', fontWeight:500 }}>MARKETING DIGITAL</div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8 }}>
                  {[
                    ['Social Media', detalhe.social_media],
                    ['Meta Ads', detalhe.meta_ads],
                    ['Google Ads', detalhe.google_ads],
                  ].filter(([,v]) => v).map(([l,v]) => (
                    <div key={l} style={{ background:'var(--bg3)', border:'1px solid var(--border2)', borderRadius:7, padding:'8px 10px' }}>
                      <div style={{ fontSize:10, color:'var(--text3)', marginBottom:2 }}>{l}</div>
                      <div style={{ fontSize:11, color:'var(--text1)', fontWeight:500 }}>{v}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Links */}
            {(detalhe.instagram || detalhe.website || detalhe.google_maps) && (
              <div style={{ marginBottom:14 }}>
                <div style={{ fontSize:10, color:'var(--text3)', marginBottom:8, letterSpacing:'0.3px', fontWeight:500 }}>LINKS</div>
                <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                  {detalhe.instagram && (
                    <a href={detalhe.instagram} target="_blank" rel="noreferrer"
                      style={{ fontSize:11, color:'var(--accent)', background:'rgba(79,124,255,0.1)', border:'1px solid rgba(79,124,255,0.2)', borderRadius:6, padding:'5px 10px', textDecoration:'none' }}>
                      📷 Instagram
                    </a>
                  )}
                  {detalhe.website && (
                    <a href={detalhe.website} target="_blank" rel="noreferrer"
                      style={{ fontSize:11, color:'var(--accent)', background:'rgba(79,124,255,0.1)', border:'1px solid rgba(79,124,255,0.2)', borderRadius:6, padding:'5px 10px', textDecoration:'none' }}>
                      🌐 Website
                    </a>
                  )}
                  {detalhe.google_maps && (
                    <a href={detalhe.google_maps} target="_blank" rel="noreferrer"
                      style={{ fontSize:11, color:'var(--accent)', background:'rgba(79,124,255,0.1)', border:'1px solid rgba(79,124,255,0.2)', borderRadius:6, padding:'5px 10px', textDecoration:'none' }}>
                      📍 Google Maps
                    </a>
                  )}
                </div>
              </div>
            )}

            {/* Observações */}
            {detalhe.observacoes && (
              <div>
                <div style={{ fontSize:10, color:'var(--text3)', marginBottom:6, letterSpacing:'0.3px', fontWeight:500 }}>OBSERVAÇÕES</div>
                <div style={{ fontSize:12, color:'var(--text2)', lineHeight:1.7, background:'var(--bg3)', border:'1px solid var(--border)', borderRadius:7, padding:'10px 12px' }}>
                  {detalhe.observacoes}
                </div>
              </div>
            )}
            </div>
            )}
          </div>
        </div>
      )}

      {/* Modal de cadastro */}
      {modal && (
        <div className="modal-overlay">
          <div style={{ background:'var(--bg2)', border:'1px solid var(--border2)', borderRadius:12, padding:24, width:560, maxHeight:'92vh', overflowY:'auto' }}>
            <div style={{ fontFamily:'var(--font-display)', fontSize:15, fontWeight:600, marginBottom:16 }}>Novo Cliente</div>

            {/* Abas */}
            <div style={{ display:'flex', gap:4, background:'var(--bg3)', borderRadius:8, padding:3, marginBottom:18 }}>
              {[
                { id:'basico',       label:'Básico'       },
                { id:'digital',      label:'Mkt Digital'  },
                { id:'localizacao',  label:'Localização'  },
                { id:'qualificacao', label:'Qualificação' },
              ].map(aba => (
                <button key={aba.id} onClick={() => setAbaForm(aba.id)}
                  style={{ flex:1, padding:'6px 0', borderRadius:6, fontSize:11, fontWeight:500, cursor:'pointer', border:'none', fontFamily:'DM Sans, sans-serif', background: abaForm===aba.id ? 'var(--bg4)' : 'none', color: abaForm===aba.id ? 'var(--text1)' : 'var(--text3)' }}>
                  {aba.label}
                </button>
              ))}
            </div>

            {/* Aba: Básico */}
            {abaForm === 'basico' && (
              <div>
                <div style={grid2}>
                  <div><label style={lbl}>NOME / EMPRESA *</label>
                    <input style={inp} value={form.nome} onChange={e => setForm({...form, nome:e.target.value})} placeholder="Nome do cliente ou empresa"/>
                  </div>
                  <div><label style={lbl}>NOME FANTASIA</label>
                    <input style={inp} value={form.empresa} onChange={e => setForm({...form, empresa:e.target.value})} placeholder="Nome fantasia (se diferente)"/>
                  </div>
                  <div><label style={lbl}>CONTATO / RESPONSÁVEL</label>
                    <input style={inp} value={form.contato} onChange={e => setForm({...form, contato:e.target.value})} placeholder="Nome do responsável"/>
                  </div>
                  <div><label style={lbl}>WHATSAPP / TELEFONE</label>
                    <input style={inp} value={form.whatsapp} onChange={e => setForm({...form, whatsapp:e.target.value})} placeholder="81 99999-9999"/>
                  </div>
                  <div><label style={lbl}>E-MAIL</label>
                    <input style={inp} value={form.email} onChange={e => setForm({...form, email:e.target.value})} placeholder="email@empresa.com"/>
                  </div>
                  <div><label style={lbl}>CNPJ</label>
                    <input style={inp} value={form.cnpj} onChange={e => setForm({...form, cnpj:e.target.value})} placeholder="00.000.000/0000-00"/>
                  </div>
                  <div><label style={lbl}>MRR (R$)</label>
                    <input style={inp} type="number" value={form.mrr} onChange={e => setForm({...form, mrr:e.target.value})} placeholder="0"/>
                  </div>
                  <div><label style={lbl}>CANAL DE VENDAS</label>
                    <input style={inp} value={form.canal_vendas} onChange={e => setForm({...form, canal_vendas:e.target.value})} placeholder="Ex: E-commerce, Loja física, WhatsApp"/>
                  </div>
                  <div><label style={lbl}>STATUS CRM</label>
                    <select style={inp} value={form.status} onChange={e => setForm({...form, status:e.target.value})}>
                      {Object.entries(STATUS_MAP).map(([k,v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                  </div>
                  <div><label style={lbl}>STATUS COMERCIAL</label>
                    <select style={inp} value={form.status_comercial} onChange={e => setForm({...form, status_comercial:e.target.value})}>
                      {STATUS_COMERCIAL.map(s => <option key={s}>{s}</option>)}
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* Aba: Marketing Digital */}
            {abaForm === 'digital' && (
              <div>
                <div style={{ marginBottom:12 }}>
                  <label style={lbl}>INSTAGRAM</label>
                  <input style={inp} value={form.instagram} onChange={e => setForm({...form, instagram:e.target.value})} placeholder="https://www.instagram.com/perfil"/>
                </div>
                <div style={{ marginBottom:12 }}>
                  <label style={lbl}>WEBSITE</label>
                  <input style={inp} value={form.website} onChange={e => setForm({...form, website:e.target.value})} placeholder="https://www.site.com.br"/>
                </div>
                <div style={{ marginBottom:16 }}>
                  <label style={lbl}>GOOGLE MAPS / GOOGLE BUSINESS (GBP)</label>
                  <input style={inp} value={form.google_maps} onChange={e => setForm({...form, google_maps:e.target.value})} placeholder="https://maps.app.goo.gl/..."/>
                </div>
                <div style={grid3}>
                  <div><label style={lbl}>SOCIAL MEDIA</label>
                    <select style={inp} value={form.social_media} onChange={e => setForm({...form, social_media:e.target.value})}>
                      <option value="">—</option>
                      {['Artes e Vídeos','Só Artes','Só Vídeos','Parado/Inexistente','Sem Frequência'].map(s => <option key={s}>{s}</option>)}
                    </select>
                  </div>
                  <div><label style={lbl}>META ADS</label>
                    <select style={inp} value={form.meta_ads} onChange={e => setForm({...form, meta_ads:e.target.value})}>
                      {['Sem Ads','Rodando','Parado','Nunca rodou'].map(s => <option key={s}>{s}</option>)}
                    </select>
                  </div>
                  <div><label style={lbl}>GOOGLE ADS</label>
                    <select style={inp} value={form.google_ads} onChange={e => setForm({...form, google_ads:e.target.value})}>
                      {['Sem Ads','Rodando','Parado','Nunca rodou'].map(s => <option key={s}>{s}</option>)}
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* Aba: Localização */}
            {abaForm === 'localizacao' && (
              <div>
                <div style={grid2}>
                  <div><label style={lbl}>SEGMENTO</label>
                    <select style={inp} value={form.segmento} onChange={e => setForm({...form, segmento:e.target.value})}>
                      <option value="">Selecione...</option>
                      {SEGMENTOS.map(s => <option key={s}>{s}</option>)}
                    </select>
                  </div>
                  <div><label style={lbl}>NICHO</label>
                    <input style={inp} value={form.nicho} onChange={e => setForm({...form, nicho:e.target.value})} placeholder="Ex: Serviços, Alimentação, Pet"/>
                  </div>
                </div>
                <div style={grid2}>
                  <div><label style={lbl}>CIDADE</label>
                    <input style={inp} value={form.cidade} onChange={e => setForm({...form, cidade:e.target.value})} placeholder="Ex: Vitoria de Santo Antão"/>
                  </div>
                  <div><label style={lbl}>ESTADO (UF)</label>
                    <select style={inp} value={form.estado} onChange={e => setForm({...form, estado:e.target.value})}>
                      <option value="">Selecione...</option>
                      {ESTADOS_BR.map(s => <option key={s}>{s}</option>)}
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* Aba: Qualificação */}
            {abaForm === 'qualificacao' && (
              <div>
                <div style={{ marginBottom:18 }}>
                  <label style={lbl}>ICP — PONTUAÇÃO DO LEAD (0 a 5 estrelas)</label>
                  <div style={{ marginTop:8, marginBottom:6 }}>
                    <Estrelas value={form.icp} onChange={v => setForm({...form, icp:v})} />
                  </div>
                  <div style={{ fontSize:11, color:'var(--text3)' }}>
                    {['Sem qualificação','Lead frio','Tem potencial','Bom lead','Lead quente','Lead ideal — cliente perfeito'][form.icp]}
                  </div>
                </div>
                <div>
                  <label style={lbl}>OBSERVAÇÕES / HISTÓRICO DE CONTATO</label>
                  <textarea style={{ ...inp, resize:'none' }} rows={5}
                    value={form.observacoes} onChange={e => setForm({...form, observacoes:e.target.value})}
                    placeholder="Anotações sobre o lead, histórico de contato, próximos passos, objeções..."/>
                </div>
              </div>
            )}

            {/* Rodapé modal */}
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginTop:20 }}>
              <div style={{ display:'flex', gap:6 }}>
                {['basico','digital','localizacao','qualificacao'].map(a => (
                  <div key={a} onClick={() => setAbaForm(a)}
                    style={{ width:8, height:8, borderRadius:'50%', cursor:'pointer', transition:'all 0.2s', background: abaForm===a ? 'var(--accent)' : 'var(--border2)' }}>
                  </div>
                ))}
              </div>
              <div style={{ display:'flex', gap:8 }}>
                <button onClick={() => { setModal(false); setForm(FORM_INICIAL) }}
                  style={{ background:'none', border:'1px solid var(--border2)', borderRadius:7, padding:'7px 16px', fontSize:12, color:'var(--text2)', cursor:'pointer' }}>
                  Cancelar
                </button>
                <button onClick={handleSave} disabled={!form.nome || saving}
                  style={{ background:'var(--accent)', border:'none', borderRadius:7, padding:'7px 16px', fontSize:12, fontWeight:500, color:'#fff', cursor:'pointer', opacity:(!form.nome||saving)?0.6:1 }}>
                  {saving ? 'Salvando...' : 'Salvar Cliente'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
