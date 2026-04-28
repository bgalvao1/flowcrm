import React, { useEffect, useState } from 'react'
import { financeiroAPI, clientesAPI } from '../lib/supabase.js'

const fmt = v => `R$ ${Number(v||0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
const STATUS_COR = { pago:'var(--green)', pendente:'var(--amber)', atraso:'var(--red)' }
const STATUS_LABEL = { pago:'Pago', pendente:'Pendente', atraso:'Atrasado' }

export default function Financeiro() {
  const [tab, setTab] = useState('visao')
  const [recorr, setRecorr] = useState([])
  const [lanc, setLanc] = useState([])
  const [clientes, setClientes] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({ descricao:'', cliente_id:'', tipo:'receita', valor:'', status:'pendente', data_lancamento: new Date().toISOString().split('T')[0] })
  const [saving, setSaving] = useState(false)

  const hoje = new Date()
  const mes = hoje.getMonth() + 1
  const ano = hoje.getFullYear()

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const [{ data: r }, { data: l }, { data: c }] = await Promise.all([
      financeiroAPI.recorrencias(),
      financeiroAPI.lancamentos(mes, ano),
      clientesAPI.listar(),
    ])
    setRecorr(r || [])
    setLanc(l || [])
    setClientes(c || [])
    setLoading(false)
  }

  async function handleSave() {
    setSaving(true)
    await financeiroAPI.criarLancamento({ ...form, valor: parseFloat(form.valor) || 0 })
    setModal(false)
    setForm({ descricao:'', cliente_id:'', tipo:'receita', valor:'', status:'pendente', data_lancamento: new Date().toISOString().split('T')[0] })
    await load()
    setSaving(false)
  }

  async function atualizarStatus(id, status) {
    await financeiroAPI.atualizarStatus(id, status)
    await load()
  }

  const mrr = recorr.reduce((a, r) => a + Number(r.valor), 0)
  const recebido = lanc.filter(l => l.tipo === 'receita' && l.status === 'pago').reduce((a, l) => a + Number(l.valor), 0)
  const aReceber = lanc.filter(l => l.tipo === 'receita' && l.status === 'pendente').reduce((a, l) => a + Number(l.valor), 0)
  const inadimplencia = lanc.filter(l => l.tipo === 'receita' && l.status === 'atraso').reduce((a, l) => a + Number(l.valor), 0)

  const inp = { width:'100%', background:'var(--bg3)', border:'1px solid var(--border2)', borderRadius:7, padding:'8px 12px', color:'var(--text1)', fontSize:12, outline:'none', fontFamily:'DM Sans, sans-serif' }
  const lbl = { fontSize:11, color:'var(--text3)', display:'block', marginBottom:4, letterSpacing:'0.3px' }

  return (
    <div>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
        <h1 style={{ fontFamily:'Syne, sans-serif', fontSize:20, fontWeight:700 }}>Financeiro</h1>
        <div style={{ display:'flex', gap:8 }}>
          <div style={{ display:'flex', gap:4, background:'var(--bg2)', borderRadius:8, padding:3 }}>
            {['visao','recorrencias','lancamentos'].map(t => (
              <button key={t} onClick={() => setTab(t)}
                style={{ padding:'5px 14px', borderRadius:6, fontSize:11, fontWeight:500, cursor:'pointer', background:tab===t?'var(--bg4)':'none', color:tab===t?'var(--text1)':'var(--text3)', border:'none', fontFamily:'DM Sans, sans-serif' }}>
                {t === 'visao' ? 'Visão Geral' : t === 'recorrencias' ? 'Recorrências' : 'Lançamentos'}
              </button>
            ))}
          </div>
          <button onClick={() => setModal(true)} style={{ background:'var(--accent)', border:'none', borderRadius:7, padding:'7px 14px', fontSize:12, fontWeight:500, color:'#fff', cursor:'pointer' }}>+ Lançamento</button>
        </div>
      </div>

      {/* Métricas */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10, marginBottom:18 }}>
        {[
          { label:'MRR', value:fmt(mrr), delta:'Recorrência mensal', cor:'var(--accent)' },
          { label:'Recebido (mês)', value:fmt(recebido), delta:'Pagamentos confirmados', cor:'var(--green)' },
          { label:'A Receber', value:fmt(aReceber), delta:'Cobranças pendentes', cor:'var(--amber)' },
          { label:'Inadimplência', value:fmt(inadimplencia), delta:'Em atraso', cor:'var(--red)' },
        ].map((c, i) => (
          <div key={i} style={{ background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:10, padding:'14px 16px' }}>
            <div style={{ fontSize:10, color:'var(--text3)', marginBottom:5, letterSpacing:'0.3px' }}>{c.label}</div>
            <div style={{ fontSize:20, fontWeight:600, fontFamily:'Syne, sans-serif', color:'var(--text1)' }}>{c.value}</div>
            <div style={{ fontSize:10, color:c.cor, marginTop:3 }}>{c.delta}</div>
          </div>
        ))}
      </div>

      {/* Visão geral */}
      {tab === 'visao' && (
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
          <div style={{ background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:10, padding:16 }}>
            <div style={{ fontSize:11, color:'var(--text3)', fontWeight:500, letterSpacing:'0.3px', marginBottom:12 }}>ÚLTIMOS LANÇAMENTOS</div>
            {lanc.slice(0, 5).map(l => (
              <div key={l.id} style={{ display:'flex', alignItems:'center', padding:'8px 0', borderBottom:'1px solid var(--border)' }}>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:12, fontWeight:500, color:'var(--text1)' }}>{l.descricao}</div>
                  <div style={{ fontSize:10, color:'var(--text3)' }}>{l.clientes?.nome || '—'} · {l.data_lancamento}</div>
                </div>
                <div style={{ fontSize:13, fontWeight:600, fontFamily:'Syne, sans-serif', color:l.tipo==='receita'?'var(--green)':'var(--red)', marginRight:10 }}>
                  {l.tipo==='receita'?'+':'-'} {fmt(l.valor)}
                </div>
                <span style={{ fontSize:10, padding:'2px 7px', borderRadius:4, fontWeight:500, background:`${STATUS_COR[l.status]}22`, color:STATUS_COR[l.status] }}>{STATUS_LABEL[l.status]}</span>
              </div>
            ))}
            {lanc.length === 0 && !loading && <div style={{ fontSize:12, color:'var(--text3)' }}>Nenhum lançamento este mês.</div>}
          </div>
          <div style={{ background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:10, padding:16 }}>
            <div style={{ fontSize:11, color:'var(--text3)', fontWeight:500, letterSpacing:'0.3px', marginBottom:12 }}>RECORRÊNCIAS ATIVAS</div>
            {recorr.slice(0, 5).map(r => (
              <div key={r.id} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'8px 0', borderBottom:'1px solid var(--border)' }}>
                <div>
                  <div style={{ fontSize:12, fontWeight:500, color:'var(--text1)' }}>{r.clientes?.nome || '—'}</div>
                  <div style={{ fontSize:10, color:'var(--text3)' }}>{r.servico} · dia {r.dia_vencimento}</div>
                </div>
                <div style={{ fontFamily:'Syne, sans-serif', fontSize:13, fontWeight:600, color:'var(--green)' }}>{fmt(r.valor)}</div>
              </div>
            ))}
            {recorr.length === 0 && !loading && <div style={{ fontSize:12, color:'var(--text3)' }}>Nenhuma recorrência cadastrada.</div>}
          </div>
        </div>
      )}

      {/* Recorrências */}
      {tab === 'recorrencias' && (
        <div style={{ background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:10, padding:16 }}>
          <div style={{ fontSize:11, color:'var(--text3)', fontWeight:500, letterSpacing:'0.3px', marginBottom:12 }}>CONTRATOS RECORRENTES</div>
          {recorr.map(r => (
            <div key={r.id} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 0', borderBottom:'1px solid var(--border)' }}>
              <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                <div style={{ width:26, height:26, borderRadius:6, background:r.clientes?.cor||'#4F7CFF', display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, fontWeight:600, color:'#fff' }}>{r.clientes?.iniciais||'??'}</div>
                <div>
                  <div style={{ fontSize:12, fontWeight:500, color:'var(--text1)' }}>{r.clientes?.nome || '—'}</div>
                  <div style={{ fontSize:10, color:'var(--text3)' }}>{r.servico} · todo dia {r.dia_vencimento}</div>
                </div>
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                <div style={{ fontFamily:'Syne, sans-serif', fontSize:14, fontWeight:600, color:'var(--green)' }}>{fmt(r.valor)}</div>
                <span style={{ fontSize:10, padding:'2px 7px', borderRadius:4, fontWeight:500, background:r.status==='atraso'?'rgba(255,91,91,0.15)':r.status==='vence'?'rgba(245,166,35,0.15)':'rgba(34,201,122,0.15)', color:r.status==='atraso'?'var(--red)':r.status==='vence'?'var(--amber)':'var(--green)' }}>
                  {r.status==='atraso'?'Em atraso':r.status==='vence'?'Vence em breve':'Ativo'}
                </span>
              </div>
            </div>
          ))}
          {recorr.length === 0 && !loading && <div style={{ fontSize:12, color:'var(--text3)' }}>Nenhuma recorrência cadastrada ainda.</div>}
        </div>
      )}

      {/* Lançamentos */}
      {tab === 'lancamentos' && (
        <div style={{ background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:10, overflow:'hidden' }}>
          <table style={{ width:'100%', borderCollapse:'collapse' }}>
            <thead>
              <tr>{['Data','Descrição','Cliente','Tipo','Valor','Status','Ação'].map(h => (
                <th key={h} style={{ fontSize:10, color:'var(--text3)', textAlign:'left', padding:'8px 12px', borderBottom:'1px solid var(--border)', fontWeight:500, letterSpacing:'0.3px' }}>{h}</th>
              ))}</tr>
            </thead>
            <tbody>
              {lanc.map(l => (
                <tr key={l.id}>
                  <td style={{ padding:'9px 12px', fontSize:12, color:'var(--text3)' }}>{l.data_lancamento}</td>
                  <td style={{ padding:'9px 12px', fontSize:12, color:'var(--text1)', fontWeight:500 }}>{l.descricao}</td>
                  <td style={{ padding:'9px 12px', fontSize:12, color:'var(--text2)' }}>{l.clientes?.nome || '—'}</td>
                  <td style={{ padding:'9px 12px' }}>
                    <span style={{ fontSize:10, padding:'2px 7px', borderRadius:4, fontWeight:500, background:l.tipo==='receita'?'rgba(79,124,255,0.15)':'rgba(255,91,91,0.15)', color:l.tipo==='receita'?'var(--accent)':'var(--red)' }}>
                      {l.tipo === 'receita' ? 'Receita' : 'Despesa'}
                    </span>
                  </td>
                  <td style={{ padding:'9px 12px', fontSize:12, fontWeight:600, fontFamily:'Syne, sans-serif', color:l.tipo==='receita'?'var(--green)':'var(--red)' }}>
                    {l.tipo==='receita'?'+':'-'} {fmt(l.valor)}
                  </td>
                  <td style={{ padding:'9px 12px' }}>
                    <span style={{ fontSize:10, padding:'2px 7px', borderRadius:4, fontWeight:500, background:`${STATUS_COR[l.status]}22`, color:STATUS_COR[l.status] }}>{STATUS_LABEL[l.status]}</span>
                  </td>
                  <td style={{ padding:'9px 12px' }}>
                    {l.status !== 'pago' && (
                      <button onClick={() => atualizarStatus(l.id, 'pago')} style={{ fontSize:10, padding:'2px 8px', borderRadius:4, background:'rgba(34,201,122,0.12)', border:'1px solid rgba(34,201,122,0.3)', color:'var(--green)', cursor:'pointer' }}>Marcar pago</button>
                    )}
                  </td>
                </tr>
              ))}
              {lanc.length === 0 && !loading && (
                <tr><td colSpan={7} style={{ padding:20, color:'var(--text3)', fontSize:12 }}>Nenhum lançamento este mês.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {modal && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.7)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000 }}>
          <div style={{ background:'var(--bg2)', border:'1px solid var(--border2)', borderRadius:12, padding:24, width:380 }}>
            <div style={{ fontFamily:'Syne, sans-serif', fontSize:15, fontWeight:600, marginBottom:18 }}>Novo Lançamento</div>
            <div style={{ display:'flex', flexDirection:'column', gap:10, marginBottom:16 }}>
              <div><label style={lbl}>DESCRIÇÃO *</label><input style={inp} value={form.descricao} onChange={e => setForm({...form, descricao:e.target.value})} placeholder="Ex: Mensalidade Agente IA"/></div>
              <div><label style={lbl}>CLIENTE</label>
                <select style={inp} value={form.cliente_id} onChange={e => setForm({...form, cliente_id:e.target.value})}>
                  <option value="">Selecione...</option>
                  {clientes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                </select>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                <div><label style={lbl}>TIPO</label>
                  <select style={inp} value={form.tipo} onChange={e => setForm({...form, tipo:e.target.value})}>
                    <option value="receita">Receita</option>
                    <option value="despesa">Despesa</option>
                  </select>
                </div>
                <div><label style={lbl}>STATUS</label>
                  <select style={inp} value={form.status} onChange={e => setForm({...form, status:e.target.value})}>
                    <option value="pendente">Pendente</option>
                    <option value="pago">Pago</option>
                    <option value="atraso">Atrasado</option>
                  </select>
                </div>
                <div><label style={lbl}>VALOR (R$)</label><input style={inp} type="number" value={form.valor} onChange={e => setForm({...form, valor:e.target.value})} placeholder="0"/></div>
                <div><label style={lbl}>DATA</label><input style={inp} type="date" value={form.data_lancamento} onChange={e => setForm({...form, data_lancamento:e.target.value})}/></div>
              </div>
            </div>
            <div style={{ display:'flex', gap:8, justifyContent:'flex-end' }}>
              <button onClick={() => setModal(false)} style={{ background:'none', border:'1px solid var(--border2)', borderRadius:7, padding:'7px 16px', fontSize:12, color:'var(--text2)', cursor:'pointer' }}>Cancelar</button>
              <button onClick={handleSave} disabled={!form.descricao || !form.valor || saving} style={{ background:'var(--accent)', border:'none', borderRadius:7, padding:'7px 16px', fontSize:12, fontWeight:500, color:'#fff', cursor:'pointer', opacity:(!form.descricao||!form.valor||saving)?0.6:1 }}>
                {saving ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
