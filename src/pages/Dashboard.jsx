import React, { useEffect, useState } from 'react'
import { supabase, financeiroAPI } from '../lib/supabase.js'
import { useNavigate } from 'react-router-dom'

const fmt = (v) => `R$ ${Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 0 })}`

export default function Dashboard() {
  const [metrics, setMetrics] = useState({ mrr: 0, clientesAtivos: 0, pipelineTotal: 0, taxaConversao: 0 })
  const [atividades, setAtividades] = useState([])
  const [servicos, setServicos] = useState([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    loadAll()
  }, [])

  async function loadAll() {
    try {
      const [{ data: clientes }, { data: deals }, { data: projetos }, { data: recorr }] = await Promise.all([
        supabase.from('clientes').select('id, status, mrr'),
        supabase.from('deals').select('id, etapa, valor, nome, empresa, criado_em'),
        supabase.from('projetos').select('id, etapa'),
        supabase.from('recorrencias').select('valor').eq('ativo', true),
      ])

      const clientesAtivos = clientes?.filter(c => c.status === 'ativo').length ?? 0
      const pipelineTotal = deals?.reduce((a, d) => a + Number(d.valor), 0) ?? 0
      const ganhos = deals?.filter(d => d.etapa === 'fechado').length ?? 0
      const taxaConversao = deals?.length ? Math.round(ganhos / deals.length * 100) : 0
      const mrr = recorr?.reduce((a, r) => a + Number(r.valor), 0) ?? 0

      setMetrics({ mrr, clientesAtivos, pipelineTotal, taxaConversao })

      // atividades recentes dos deals
      const recent = [...(deals || [])].sort((a, b) => new Date(b.criado_em) - new Date(a.criado_em)).slice(0, 5)
      setAtividades(recent.map(d => ({
        texto: `Novo deal: ${d.nome} — ${d.empresa || ''}`,
        cor: d.etapa === 'fechado' ? 'var(--green)' : d.etapa === 'perdido' ? 'var(--red)' : 'var(--accent)',
        tempo: new Date(d.criado_em).toLocaleDateString('pt-BR'),
      })))

      // receita por segmento a partir de clientes
      const segs = {}
      clientes?.forEach(c => { segs['Clientes'] = (segs['Clientes'] || 0) + Number(c.mrr || 0) })
      setServicos(Object.entries(segs).map(([k, v]) => ({ label: k, pct: 100, valor: v })))
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const cards = [
    { label: 'MRR', value: fmt(metrics.mrr), delta: '↑ Receita recorrente mensal', cor: 'var(--accent)' },
    { label: 'Clientes Ativos', value: metrics.clientesAtivos, delta: 'Com contratos vigentes', cor: 'var(--green)' },
    { label: 'Pipeline Total', value: fmt(metrics.pipelineTotal), delta: 'Em negociação', cor: 'var(--amber)' },
    { label: 'Taxa de Conversão', value: `${metrics.taxaConversao}%`, delta: 'Deals fechados / total', cor: 'var(--accent2)' },
  ]

  return (
    <div>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
        <div>
          <h1 style={{ fontFamily:'Syne, sans-serif', fontSize:20, fontWeight:700, color:'var(--text1)' }}>Dashboard</h1>
          <div style={{ fontSize:12, color:'var(--text3)', marginTop:2 }}>Visão geral da agência</div>
        </div>
        <button onClick={() => navigate('/proposta')} style={{ background:'var(--accent)', border:'none', borderRadius:7, padding:'8px 16px', fontSize:12, fontWeight:500, color:'#fff', cursor:'pointer' }}>
          + Gerar Proposta
        </button>
      </div>

      {/* AI Alert */}
      <div style={{ background:'rgba(79,124,255,0.07)', border:'1px solid rgba(79,124,255,0.2)', borderRadius:9, padding:'11px 16px', display:'flex', alignItems:'center', gap:12, marginBottom:18 }}>
        <div style={{ width:32, height:32, borderRadius:8, background:'linear-gradient(135deg,var(--accent),var(--accent2))', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="5" stroke="white" strokeWidth="1.5"/><path d="M8 5v3l2 1" stroke="white" strokeWidth="1.3" strokeLinecap="round"/></svg>
        </div>
        <div style={{ flex:1 }}>
          <div style={{ fontSize:12, fontWeight:500, color:'var(--text1)' }}>FlowCRM com dados reais do Supabase</div>
          <div style={{ fontSize:11, color:'var(--text2)' }}>Todas as métricas são calculadas ao vivo com os dados do seu banco</div>
        </div>
      </div>

      {/* Metrics */}
      {loading ? (
        <div style={{ color:'var(--text3)', fontSize:12, padding:'20px 0' }}>Carregando métricas...</div>
      ) : (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10, marginBottom:18 }}>
          {cards.map((c, i) => (
            <div key={i} style={{ background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:10, padding:'14px 16px' }}>
              <div style={{ fontSize:10, color:'var(--text3)', marginBottom:5, letterSpacing:'0.3px' }}>{c.label}</div>
              <div style={{ fontSize:22, fontWeight:600, fontFamily:'Syne, sans-serif', color:'var(--text1)' }}>{c.value}</div>
              <div style={{ fontSize:11, color:c.cor, marginTop:3 }}>{c.delta}</div>
            </div>
          ))}
        </div>
      )}

      {/* Bottom row */}
      <div style={{ display:'grid', gridTemplateColumns:'1.4fr 1fr', gap:12 }}>
        <div style={{ background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:10, padding:16 }}>
          <div style={{ fontSize:11, color:'var(--text3)', fontWeight:500, letterSpacing:'0.3px', marginBottom:12 }}>ATIVIDADE RECENTE</div>
          {atividades.length === 0 && <div style={{ fontSize:12, color:'var(--text3)' }}>Nenhuma atividade ainda. Crie deals no Pipeline!</div>}
          {atividades.map((a, i) => (
            <div key={i} style={{ display:'flex', alignItems:'flex-start', gap:10, padding:'7px 0', borderBottom:'1px solid var(--border)' }}>
              <div style={{ width:7, height:7, borderRadius:'50%', background:a.cor, marginTop:5, flexShrink:0 }}></div>
              <div style={{ flex:1, fontSize:12, color:'var(--text2)' }}>{a.texto}</div>
              <div style={{ fontSize:10, color:'var(--text3)', whiteSpace:'nowrap' }}>{a.tempo}</div>
            </div>
          ))}
        </div>
        <div style={{ background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:10, padding:16 }}>
          <div style={{ fontSize:11, color:'var(--text3)', fontWeight:500, letterSpacing:'0.3px', marginBottom:12 }}>AÇÕES RÁPIDAS</div>
          {[
            { label:'Novo cliente', path:'/clientes', cor:'var(--accent)' },
            { label:'Novo deal', path:'/pipeline', cor:'var(--green)' },
            { label:'Novo projeto', path:'/projetos', cor:'var(--amber)' },
            { label:'Gerar proposta com IA', path:'/proposta', cor:'var(--accent2)' },
            { label:'Ver financeiro', path:'/financeiro', cor:'var(--red)' },
          ].map((item, i) => (
            <button key={i} onClick={() => navigate(item.path)}
              style={{ display:'flex', alignItems:'center', gap:10, width:'100%', background:'var(--bg3)', border:'1px solid var(--border2)', borderRadius:7, padding:'9px 12px', color:'var(--text2)', fontSize:12, marginBottom:7, cursor:'pointer', textAlign:'left', transition:'all 0.15s' }}>
              <div style={{ width:6, height:6, borderRadius:'50%', background:item.cor, flexShrink:0 }}></div>
              {item.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
