import React, { useEffect, useState, useRef } from 'react'
import { supabase, clientesAPI } from '../lib/supabase.js'

const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']
const MESES_CURTOS = ['JAN','FEV','MAR','ABR','MAI','JUN','JUL','AGO','SET','OUT','NOV','DEZ']

const CATEGORIAS_RECEITA = ['Serviços','Consultoria','Produtos','Assinaturas','Comissões','Outros']
const CATEGORIAS_DESPESA = ['Pessoal','Ferramentas','Marketing','Infraestrutura','Impostos','Fornecedores','Outros']

const fmt = v => `R$ ${Number(v||0).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2})}`

const FORM_INICIAL = {
  tipo: 'receita',
  ano: new Date().getFullYear(),
  mes: new Date().getMonth() + 1,
  descricao: '',
  categoria: '',
  subcategoria: '',
  valor: '',
  cliente_id: '',
  data_vencimento: '',
  pago: false,
  status: 'pendente',
}

export default function Financeiro() {
  const [tab, setTab]           = useState('visao')
  const [lancamentos, setLanc]  = useState([])
  const [clientes, setClientes] = useState([])
  const [loading, setLoading]   = useState(true)
  const [modal, setModal]       = useState(false)
  const [form, setForm]         = useState(FORM_INICIAL)
  const [saving, setSaving]     = useState(false)
  const [anoFiltro, setAnoFiltro] = useState(new Date().getFullYear())
  const canvasRef = useRef()

  const anoAtual = new Date().getFullYear()
  const anos = [anoAtual-1, anoAtual, anoAtual+1]

  useEffect(() => { load() }, [anoFiltro])

  async function load() {
    setLoading(true)
    const [{ data: l }, { data: c }] = await Promise.all([
      supabase.from('lancamentos').select('*, clientes(nome)').eq('ano', anoFiltro).order('data_lancamento', { ascending: false }),
      clientesAPI.listar(),
    ])
    setLanc(l || [])
    setClientes(c || [])
    setLoading(false)
  }

  async function handleSave() {
    setSaving(true)
    const payload = {
      ...form,
      valor: parseFloat(form.valor) || 0,
      cliente_id: form.cliente_id || null,
      data_vencimento: form.data_vencimento || null,
      status: form.pago ? 'pago' : 'pendente',
      data_lancamento: `${form.ano}-${String(form.mes).padStart(2,'0')}-01`,
    }
    await supabase.from('lancamentos').insert(payload)
    setModal(false)
    setForm(FORM_INICIAL)
    await load()
    setSaving(false)
  }

  async function togglePago(id, pago) {
    await supabase.from('lancamentos').update({ pago, status: pago ? 'pago' : 'pendente' }).eq('id', id)
    await load()
  }

  async function deletar(id) {
    if (!confirm('Remover lançamento?')) return
    await supabase.from('lancamentos').delete().eq('id', id)
    await load()
  }

  // Métricas gerais do ano
  const receitas    = lancamentos.filter(l => l.tipo === 'receita').reduce((a,l) => a + Number(l.valor||0), 0)
  const despesas    = lancamentos.filter(l => l.tipo === 'despesa').reduce((a,l) => a + Number(l.valor||0), 0)
  const saldo       = receitas - despesas
  const aPagar      = lancamentos.filter(l => l.tipo === 'despesa' && !l.pago).reduce((a,l) => a + Number(l.valor||0), 0)

  // Dados por mês
  const porMes = MESES_CURTOS.map((_, i) => {
    const mesNum = i + 1
    const r = lancamentos.filter(l => l.tipo==='receita' && l.mes===mesNum).reduce((a,l)=>a+Number(l.valor||0),0)
    const d = lancamentos.filter(l => l.tipo==='despesa' && l.mes===mesNum).reduce((a,l)=>a+Number(l.valor||0),0)
    return { mes: MESES_CURTOS[i], r, d, s: r - d }
  })

  // Canvas gráfico
  useEffect(() => {
    if (tab !== 'visao' || !canvasRef.current) return
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const W = canvas.width = canvas.offsetWidth || 600
    const H = canvas.height = 180
    ctx.clearRect(0, 0, W, H)

    const maxVal = Math.max(...porMes.map(m => Math.max(m.r, m.d)), 100)
    const padL = 50, padR = 20, padT = 20, padB = 30
    const chartW = W - padL - padR
    const chartH = H - padT - padB
    const barW = (chartW / 12) * 0.35

    // Linhas de grade
    ctx.strokeStyle = 'rgba(255,255,255,0.05)'
    ctx.lineWidth = 1
    for (let i = 0; i <= 4; i++) {
      const y = padT + (chartH / 4) * i
      ctx.beginPath(); ctx.moveTo(padL, y); ctx.lineTo(W - padR, y); ctx.stroke()
      ctx.fillStyle = '#5C6478'
      ctx.font = '10px DM Sans'
      ctx.textAlign = 'right'
      const val = maxVal - (maxVal / 4) * i
      ctx.fillText(val >= 1000 ? `${(val/1000).toFixed(0)}k` : val.toFixed(0), padL - 4, y + 3)
    }

    porMes.forEach((m, i) => {
      const x = padL + (chartW / 12) * i + (chartW / 12) / 2
      // Receita
      const rH = (m.r / maxVal) * chartH
      ctx.fillStyle = '#22C97A'
      ctx.fillRect(x - barW - 2, padT + chartH - rH, barW, rH)
      // Despesa
      const dH = (m.d / maxVal) * chartH
      ctx.fillStyle = '#FF5B5B'
      ctx.fillRect(x + 2, padT + chartH - dH, barW, dH)
      // Label mês
      ctx.fillStyle = '#5C6478'
      ctx.font = '10px DM Sans'
      ctx.textAlign = 'center'
      ctx.fillText(m.mes.toLowerCase() + '.', x, H - 8)
    })
  }, [tab, lancamentos])

  const inp = {
    width:'100%', background:'var(--bg3)', border:'1px solid var(--border2)',
    borderRadius:7, padding:'8px 12px', color:'var(--text1)',
    fontSize:12, outline:'none', fontFamily:'DM Sans, sans-serif',
  }
  const lbl = { fontSize:11, color:'var(--text3)', display:'block', marginBottom:4, letterSpacing:'0.3px' }

  return (
    <div>
      {/* Header */}
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:20 }}>
        <div>
          <h1 style={{ fontFamily:'Syne, sans-serif', fontSize:20, fontWeight:700 }}>Financeiro</h1>
          <div style={{ fontSize:12, color:'var(--text3)', marginTop:2 }}>Controle de receitas e despesas</div>
        </div>
        <div style={{ display:'flex', gap:8, alignItems:'center' }}>
          <select value={anoFiltro} onChange={e => setAnoFiltro(Number(e.target.value))}
            style={{ ...inp, width:90, padding:'7px 10px' }}>
            {anos.map(a => <option key={a}>{a}</option>)}
          </select>
          <button onClick={() => setModal(true)}
            style={{ background:'var(--accent)', border:'none', borderRadius:7, padding:'8px 16px', fontSize:12, fontWeight:500, color:'#fff', cursor:'pointer', whiteSpace:'nowrap' }}>
            + Novo Lançamento
          </button>
        </div>
      </div>

      {/* Métricas */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10, marginBottom:18 }}>
        {[
          { label:'Receitas', value: fmt(receitas), cor:'var(--green)', bg:'rgba(34,201,122,0.08)', icon:'📈' },
          { label:'Despesas', value: fmt(despesas), cor:'var(--red)', bg:'rgba(255,91,91,0.08)', icon:'📉' },
          { label:'Saldo', value: fmt(saldo), cor: saldo >= 0 ? 'var(--green)' : 'var(--red)', bg:'rgba(79,124,255,0.08)', icon:'💲' },
          { label:'A Pagar', value: fmt(aPagar), cor:'var(--amber)', bg:'rgba(245,166,35,0.08)', icon:'💳' },
        ].map((m,i) => (
          <div key={i} style={{ background: m.bg, border:`1px solid ${m.cor}33`, borderRadius:10, padding:'14px 16px', display:'flex', alignItems:'center', gap:12 }}>
            <div style={{ fontSize:22 }}>{m.icon}</div>
            <div>
              <div style={{ fontSize:10, color:'var(--text3)', marginBottom:3, letterSpacing:'0.3px' }}>{m.label.toUpperCase()}</div>
              <div style={{ fontFamily:'Syne, sans-serif', fontSize:18, fontWeight:700, color:m.cor }}>{m.value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display:'flex', gap:4, marginBottom:16 }}>
        {[
          { id:'visao', label:'Visão Geral' },
          { id:'lancamentos', label:'Lançamentos' },
          { id:'pormes', label:'Por Mês' },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{ padding:'7px 18px', borderRadius:20, fontSize:12, fontWeight:500, cursor:'pointer', border: tab===t.id ? '1px solid var(--accent)' : '1px solid var(--border2)', fontFamily:'DM Sans, sans-serif', background: tab===t.id ? 'transparent' : 'none', color: tab===t.id ? 'var(--accent)' : 'var(--text3)', transition:'all 0.15s' }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Visão Geral */}
      {tab === 'visao' && (
        <div style={{ background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:10, padding:20 }}>
          <div style={{ fontFamily:'Syne, sans-serif', fontSize:14, fontWeight:600, marginBottom:16 }}>
            Receitas vs Despesas por Mês
          </div>
          <canvas ref={canvasRef} style={{ width:'100%', height:180, display:'block' }}></canvas>
          {/* Legenda */}
          <div style={{ display:'flex', justifyContent:'center', gap:20, marginTop:10 }}>
            <div style={{ display:'flex', alignItems:'center', gap:6, fontSize:11, color:'var(--text3)' }}>
              <div style={{ width:10, height:10, borderRadius:2, background:'var(--green)' }}></div> Receitas
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:6, fontSize:11, color:'var(--text3)' }}>
              <div style={{ width:10, height:10, borderRadius:2, background:'var(--red)' }}></div> Despesas
            </div>
          </div>
        </div>
      )}

      {/* Lançamentos */}
      {tab === 'lancamentos' && (
        <div style={{ background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:10, overflow:'hidden' }}>
          <table style={{ width:'100%', borderCollapse:'collapse' }}>
            <thead>
              <tr>
                {['Descrição','Categoria','Empresa/Cliente','Mês','Valor','Vencimento','Pago','Ação'].map(h => (
                  <th key={h} style={{ fontSize:10, color:'var(--text3)', textAlign:'left', padding:'8px 12px', borderBottom:'1px solid var(--border)', fontWeight:500, letterSpacing:'0.3px' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={8} style={{ padding:20, color:'var(--text3)', fontSize:12 }}>Carregando...</td></tr>}
              {!loading && lancamentos.length === 0 && (
                <tr><td colSpan={8} style={{ padding:20, color:'var(--text3)', fontSize:12 }}>Nenhum lançamento em {anoFiltro}.</td></tr>
              )}
              {lancamentos.map(l => (
                <tr key={l.id} style={{ borderBottom:'1px solid var(--border)' }}>
                  <td style={{ padding:'9px 12px' }}>
                    <div style={{ fontSize:12, fontWeight:500, color:'var(--text1)' }}>{l.descricao}</div>
                    {l.subcategoria && <div style={{ fontSize:10, color:'var(--text3)' }}>{l.subcategoria}</div>}
                  </td>
                  <td style={{ padding:'9px 12px' }}>
                    {l.categoria && (
                      <span style={{ fontSize:10, padding:'2px 7px', borderRadius:4, fontWeight:500, background: l.tipo==='receita' ? 'rgba(34,201,122,0.12)' : 'rgba(255,91,91,0.12)', color: l.tipo==='receita' ? 'var(--green)' : 'var(--red)' }}>
                        {l.categoria}
                      </span>
                    )}
                  </td>
                  <td style={{ fontSize:11, color:'var(--text2)', padding:'9px 12px' }}>{l.clientes?.nome || '—'}</td>
                  <td style={{ fontSize:11, color:'var(--text3)', padding:'9px 12px' }}>{MESES[l.mes-1]?.slice(0,3) || '—'}/{l.ano}</td>
                  <td style={{ padding:'9px 12px', fontFamily:'Syne, sans-serif', fontSize:12, fontWeight:600, color: l.tipo==='receita' ? 'var(--green)' : 'var(--red)' }}>
                    {l.tipo==='receita'?'+':'-'} {fmt(l.valor)}
                  </td>
                  <td style={{ fontSize:11, color:'var(--text3)', padding:'9px 12px' }}>
                    {l.data_vencimento ? new Date(l.data_vencimento).toLocaleDateString('pt-BR') : '—'}
                  </td>
                  <td style={{ padding:'9px 12px' }}>
                    <div onClick={() => togglePago(l.id, !l.pago)}
                      style={{
                        width:36, height:20, borderRadius:10, cursor:'pointer', transition:'all 0.2s',
                        background: l.pago ? 'var(--green)' : 'var(--bg4)',
                        position:'relative', flexShrink:0,
                      }}>
                      <div style={{
                        width:16, height:16, borderRadius:'50%', background:'#fff',
                        position:'absolute', top:2, transition:'all 0.2s',
                        left: l.pago ? 18 : 2,
                      }}></div>
                    </div>
                  </td>
                  <td style={{ padding:'9px 12px' }}>
                    <button onClick={() => deletar(l.id)}
                      style={{ background:'none', border:'none', color:'var(--text3)', cursor:'pointer', fontSize:13 }}>✕</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Por Mês */}
      {tab === 'pormes' && (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(6,1fr)', gap:10 }}>
          {porMes.map((m, i) => (
            <div key={i} style={{ background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:10, padding:'14px 14px', textAlign:'center', cursor:'pointer', transition:'all 0.15s' }}
              onClick={() => { setTab('lancamentos'); }}>
              <div style={{ fontFamily:'Syne, sans-serif', fontSize:13, fontWeight:700, color:'var(--text2)', marginBottom:8, letterSpacing:'0.5px' }}>{m.mes}</div>
              <div style={{ fontSize:12, color:'var(--green)', marginBottom:2 }}>+{fmt(m.r)}</div>
              <div style={{ fontSize:12, color:'var(--red)', marginBottom:6 }}>-{fmt(m.d)}</div>
              <div style={{ fontFamily:'Syne, sans-serif', fontSize:13, fontWeight:700, color: m.s >= 0 ? 'var(--green)' : 'var(--red)', borderTop:'1px solid var(--border)', paddingTop:6 }}>
                {fmt(m.s)}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Novo Lançamento */}
      {modal && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.7)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000 }}>
          <div style={{ background:'var(--bg2)', border:'1px solid var(--border2)', borderRadius:12, padding:24, width:460, maxHeight:'90vh', overflowY:'auto' }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:18 }}>
              <div style={{ fontFamily:'Syne, sans-serif', fontSize:15, fontWeight:600 }}>Novo Lançamento</div>
              <button onClick={() => setModal(false)} style={{ background:'none', border:'none', color:'var(--text3)', cursor:'pointer', fontSize:18 }}>✕</button>
            </div>

            {/* Toggle Receita / Despesa */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:0, background:'var(--bg3)', borderRadius:8, padding:3, marginBottom:18 }}>
              <button onClick={() => setForm({...form, tipo:'receita', categoria:''})}
                style={{ padding:'9px', borderRadius:6, fontSize:13, fontWeight:600, cursor:'pointer', border:'none', fontFamily:'DM Sans, sans-serif', background: form.tipo==='receita' ? 'var(--green)' : 'transparent', color: form.tipo==='receita' ? '#fff' : 'var(--text3)', transition:'all 0.2s' }}>
                Receita
              </button>
              <button onClick={() => setForm({...form, tipo:'despesa', categoria:''})}
                style={{ padding:'9px', borderRadius:6, fontSize:13, fontWeight:600, cursor:'pointer', border:'none', fontFamily:'DM Sans, sans-serif', background: form.tipo==='despesa' ? 'var(--red)' : 'transparent', color: form.tipo==='despesa' ? '#fff' : 'var(--text3)', transition:'all 0.2s' }}>
                Despesa
              </button>
            </div>

            <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
              {/* Ano e Mês */}
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                <div>
                  <label style={lbl}>ANO</label>
                  <select style={inp} value={form.ano} onChange={e => setForm({...form, ano:Number(e.target.value)})}>
                    {anos.map(a => <option key={a}>{a}</option>)}
                  </select>
                </div>
                <div>
                  <label style={lbl}>MÊS</label>
                  <select style={inp} value={form.mes} onChange={e => setForm({...form, mes:Number(e.target.value)})}>
                    {MESES.map((m,i) => <option key={i+1} value={i+1}>{m}</option>)}
                  </select>
                </div>
              </div>

              {/* Descrição */}
              <div>
                <label style={lbl}>DESCRIÇÃO *</label>
                <input style={inp} value={form.descricao} onChange={e => setForm({...form, descricao:e.target.value})} placeholder="Ex: Mensalidade Cliente ABC"/>
              </div>

              {/* Categoria e Subcategoria */}
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                <div>
                  <label style={lbl}>CATEGORIA *</label>
                  <select style={inp} value={form.categoria} onChange={e => setForm({...form, categoria:e.target.value})}>
                    <option value="">Selecione</option>
                    {(form.tipo==='receita' ? CATEGORIAS_RECEITA : CATEGORIAS_DESPESA).map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label style={lbl}>SUBCATEGORIA</label>
                  <input style={inp} value={form.subcategoria} onChange={e => setForm({...form, subcategoria:e.target.value})} placeholder="Opcional"/>
                </div>
              </div>

              {/* Valor */}
              <div>
                <label style={lbl}>VALOR (R$) *</label>
                <input style={inp} type="number" value={form.valor} onChange={e => setForm({...form, valor:e.target.value})} placeholder="0"/>
              </div>

              {/* Empresa/Cliente */}
              <div>
                <label style={lbl}>EMPRESA / CLIENTE</label>
                <select style={inp} value={form.cliente_id} onChange={e => setForm({...form, cliente_id:e.target.value})}>
                  <option value="">Nenhuma</option>
                  {clientes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                </select>
              </div>

              {/* Data de Vencimento */}
              <div>
                <label style={lbl}>DATA DE VENCIMENTO</label>
                <input style={inp} type="date" value={form.data_vencimento} onChange={e => setForm({...form, data_vencimento:e.target.value})}/>
              </div>

              {/* Pago/Recebido toggle */}
              <div style={{ background:'var(--bg3)', border:'1px solid var(--border2)', borderRadius:8, padding:'12px 14px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                <span style={{ fontSize:13, fontWeight:500, color:'var(--text1)' }}>
                  {form.tipo === 'receita' ? 'Recebido' : 'Pago'}
                </span>
                <div onClick={() => setForm({...form, pago:!form.pago})}
                  style={{
                    width:40, height:22, borderRadius:11, cursor:'pointer', transition:'all 0.2s',
                    background: form.pago ? (form.tipo==='receita'?'var(--green)':'var(--red)') : 'var(--bg4)',
                    position:'relative',
                  }}>
                  <div style={{
                    width:18, height:18, borderRadius:'50%', background:'#fff',
                    position:'absolute', top:2, transition:'all 0.2s',
                    left: form.pago ? 20 : 2,
                  }}></div>
                </div>
              </div>
            </div>

            <div style={{ display:'flex', gap:8, justifyContent:'flex-end', marginTop:20 }}>
              <button onClick={() => setModal(false)}
                style={{ background:'none', border:'1px solid var(--border2)', borderRadius:7, padding:'8px 16px', fontSize:12, color:'var(--text2)', cursor:'pointer' }}>
                Cancelar
              </button>
              <button onClick={handleSave} disabled={!form.descricao || !form.valor || saving}
                style={{ background: form.tipo==='receita' ? 'var(--green)' : 'var(--red)', border:'none', borderRadius:7, padding:'8px 20px', fontSize:13, fontWeight:500, color:'#fff', cursor:'pointer', opacity:(!form.descricao||!form.valor||saving)?0.6:1 }}>
                {saving ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
