import React, { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { useNavigate } from 'react-router-dom'

const fmt = (v) => `R$ ${Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 0 })}`
const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

function MiniSparkline({ data, cor = 'var(--accent)' }) {
  if (!data || data.length < 2) return null
  const max = Math.max(...data.map(d => d.valor), 1)
  const W = 280, H = 60, PAD = 8
  const pts = data.map((d, i) => {
    const x = PAD + (i / (data.length - 1)) * (W - PAD * 2)
    const y = H - PAD - ((d.valor / max) * (H - PAD * 2))
    return { x, y, ...d }
  })
  const path = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ')
  const area = `${path} L${pts[pts.length - 1].x},${H} L${pts[0].x},${H} Z`

  return (
    <svg width={W} height={H} style={{ overflow: 'visible' }}>
      <defs>
        <linearGradient id="spark-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={cor} stopOpacity="0.25" />
          <stop offset="100%" stopColor={cor} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#spark-grad)" />
      <path d={path} fill="none" stroke={cor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {pts.map((p, i) => (
        <g key={i}>
          <circle cx={p.x} cy={p.y} r="3" fill={cor} />
          <text x={p.x} y={H - 1} textAnchor="middle" fontSize="9" fill="var(--text3)">{MESES[p.mes - 1]}</text>
        </g>
      ))}
    </svg>
  )
}

export default function Dashboard() {
  const [metrics, setMetrics] = useState({ mrr: 0, clientesAtivos: 0, pipelineTotal: 0, taxaConversao: 0 })
  const [atividades, setAtividades] = useState([])
  const [mrrHistorico, setMrrHistorico] = useState([])
  const [tarefasVencidas, setTarefasVencidas] = useState(0)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    try {
      const hoje = new Date().toISOString().split('T')[0]
      const [
        { data: clientes },
        { data: deals },
        { data: recorr },
        { data: mrrHist },
        { data: tarefas },
        { data: projetos },
      ] = await Promise.all([
        supabase.from('clientes').select('id, status, mrr'),
        supabase.from('deals').select('id, etapa, valor, nome, empresa, criado_em'),
        supabase.from('recorrencias').select('valor').eq('ativo', true),
        supabase.from('mrr_historico').select('mes, ano, valor').order('ano').order('mes'),
        supabase.from('tarefas').select('id, concluida, prazo').eq('concluida', false).not('prazo', 'is', null).lt('prazo', hoje),
        supabase.from('projetos').select('id, etapa'),
      ])

      const clientesAtivos = clientes?.filter(c => c.status === 'ativo').length ?? 0
      const pipelineTotal = deals?.reduce((a, d) => a + Number(d.valor), 0) ?? 0
      const ganhos = deals?.filter(d => d.etapa === 'fechado').length ?? 0
      const taxaConversao = deals?.length ? Math.round(ganhos / deals.length * 100) : 0
      const mrr = recorr?.reduce((a, r) => a + Number(r.valor), 0) ?? 0

      setMetrics({ mrr, clientesAtivos, pipelineTotal, taxaConversao })
      setTarefasVencidas(tarefas?.length ?? 0)

      // MRR histórico: injeta o valor atual no mês corrente
      const mesAtual = new Date().getMonth() + 1
      const anoAtual = new Date().getFullYear()
      const hist = (mrrHist || []).map(h =>
        h.mes === mesAtual && h.ano === anoAtual ? { ...h, valor: mrr } : h
      )
      setMrrHistorico(hist)

      // Atualiza MRR do mês atual no banco
      await supabase.from('mrr_historico').upsert({ mes: mesAtual, ano: anoAtual, valor: mrr }, { onConflict: 'mes,ano' })

      const recent = [...(deals || [])].sort((a, b) => new Date(b.criado_em) - new Date(a.criado_em)).slice(0, 5)
      setAtividades(recent.map(d => ({
        texto: `${d.nome} — ${d.empresa || 'sem empresa'}`,
        etapa: d.etapa,
        tempo: new Date(d.criado_em).toLocaleDateString('pt-BR'),
      })))
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  const ETAPA_COR = { fechado: 'var(--green)', perdido: 'var(--red)', proposta: 'var(--amber)', qualificacao: 'var(--sky)', prospeccao: 'var(--text3)' }
  const ETAPA_LABEL = { fechado: 'Fechado', perdido: 'Perdido', proposta: 'Proposta', qualificacao: 'Qualificação', prospeccao: 'Prospecção' }

  const cards = [
    { label: 'MRR', value: fmt(metrics.mrr), sub: 'Receita recorrente mensal', cor: 'var(--accent)' },
    { label: 'Clientes Ativos', value: metrics.clientesAtivos, sub: 'Contratos vigentes', cor: 'var(--green)' },
    { label: 'Pipeline Total', value: fmt(metrics.pipelineTotal), sub: 'Em negociação', cor: 'var(--amber)' },
    { label: 'Taxa de Conversão', value: `${metrics.taxaConversao}%`, sub: 'Deals fechados / total', cor: 'var(--sky)' },
  ]

  const ACOES = [
    { label: 'Novo cliente', path: '/clientes', badge: 'Clientes' },
    { label: 'Novo deal', path: '/pipeline', badge: 'Pipeline' },
    { label: 'Novo projeto', path: '/projetos', badge: 'Projetos' },
    { label: 'Gerar proposta com IA', path: '/proposta', badge: 'IA' },
    { label: 'Ver financeiro', path: '/financeiro', badge: 'Financeiro' },
  ]

  return (
    <div>
      <div className="fade-up" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 className="page-title">Dashboard</h1>
          <div className="page-sub">Visão geral da agência</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {tarefasVencidas > 0 && (
            <button
              onClick={() => navigate('/tarefas')}
              style={{ display: 'flex', alignItems: 'center', gap: 7, background: 'rgba(232,100,91,0.1)', border: '1px solid rgba(232,100,91,0.3)', borderRadius: 8, padding: '7px 12px', cursor: 'pointer', fontSize: 12, color: 'var(--red)' }}
            >
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--red)', animation: 'pulse-dot 2s ease infinite' }} />
              {tarefasVencidas} tarefa{tarefasVencidas > 1 ? 's' : ''} vencida{tarefasVencidas > 1 ? 's' : ''}
            </button>
          )}
          <button className="btn btn-primary" onClick={() => navigate('/proposta')}>
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none"><path d="M8 2v12M2 8h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
            Gerar Proposta
          </button>
        </div>
      </div>

      {/* Metric cards */}
      {loading ? (
        <div className="stagger" style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginBottom: 18 }}>
          {[0,1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 90 }} />)}
        </div>
      ) : (
        <div className="stagger" style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginBottom: 18 }}>
          {cards.map((c, i) => (
            <div key={i} className="card card-hover" style={{ borderTop: `2px solid ${c.cor}` }}>
              <div className="eyebrow" style={{ marginBottom: 6 }}>{c.label}</div>
              <div className="num" style={{ fontSize: 22, fontWeight: 700, color: 'var(--text1)', letterSpacing: '-0.02em' }}>{c.value}</div>
              <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4 }}>{c.sub}</div>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
        {/* Gráfico MRR */}
        <div className="card fade-up">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div className="eyebrow">MRR — Evolução anual</div>
            <span className="num" style={{ fontSize: 13, fontWeight: 700, color: 'var(--accent)' }}>{fmt(metrics.mrr)}</span>
          </div>
          {mrrHistorico.length >= 2 ? (
            <MiniSparkline data={mrrHistorico} cor="var(--accent)" />
          ) : (
            <div style={{ fontSize: 12, color: 'var(--text3)', padding: '16px 0' }}>
              Dados de MRR aparecerão aqui conforme o tempo passa.
            </div>
          )}
        </div>

        {/* Ações rápidas */}
        <div className="card fade-up">
          <div className="eyebrow" style={{ marginBottom: 14 }}>Ações rápidas</div>
          <div className="stagger">
            {ACOES.map((item, i) => (
              <button
                key={i}
                onClick={() => navigate(item.path)}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', background: 'var(--bg3)', border: '1px solid var(--border2)', borderRadius: 8, padding: '10px 12px', color: 'var(--text2)', fontSize: 12, marginBottom: 7, cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s' }}
                onMouseEnter={e => { e.currentTarget.style.background = 'var(--gold-08)'; e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.color = 'var(--text1)' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'var(--bg3)'; e.currentTarget.style.borderColor = 'var(--border2)'; e.currentTarget.style.color = 'var(--text2)' }}
              >
                {item.label}
                <span className="badge badge-gold">{item.badge}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Atividade recente */}
      <div className="card fade-up">
        <div className="eyebrow" style={{ marginBottom: 14 }}>Atividade recente — Deals</div>
        {atividades.length === 0 && (
          <div style={{ fontSize: 12, color: 'var(--text3)', padding: '12px 0' }}>
            Nenhuma atividade ainda. Crie deals no Pipeline!
          </div>
        )}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 10 }}>
          {atividades.map((a, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 12px', background: 'var(--bg3)', borderRadius: 8, border: '1px solid var(--border)' }}>
              <div style={{ width: 7, height: 7, borderRadius: '50%', background: ETAPA_COR[a.etapa] || 'var(--text3)', marginTop: 4, flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, color: 'var(--text1)', fontWeight: 500 }}>{a.texto}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                  <span className="badge" style={{ background: `${ETAPA_COR[a.etapa]}22`, color: ETAPA_COR[a.etapa], fontSize: 9 }}>{ETAPA_LABEL[a.etapa]}</span>
                  <span style={{ fontSize: 10, color: 'var(--text3)' }}>{a.tempo}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
