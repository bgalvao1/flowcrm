import React, { useState, useEffect } from 'react'
import { supabase, mensagensAPI } from '../lib/supabase.js'

export default function Portal() {
  const [logado, setLogado] = useState(false)
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')
  const [pview, setPview] = useState('inicio')
  const [msgs, setMsgs] = useState([])
  const [novaMsg, setNovaMsg] = useState('')
  const [cliente, setCliente] = useState(null)
  const [projetos, setProjetos] = useState([])

  // Login simulado — em produção usar Supabase Auth com magic link por cliente
  async function handleLogin(e) {
    e.preventDefault()
    setErro('')
    const { data, error } = await supabase.from('clientes').select('*').eq('email', email).single()
    if (error || !data) { setErro('E-mail não encontrado. Verifique com a agência.'); return }
    setCliente(data)
    // carregar projetos
    const { data: p } = await supabase.from('projetos').select('*, tarefas(*), entregas(*)').eq('cliente_id', data.id)
    setProjetos(p || [])
    // carregar mensagens
    const { data: m } = await mensagensAPI.listar(data.id)
    setMsgs(m || [])
    // realtime
    mensagensAPI.assinar(data.id, msg => setMsgs(prev => [...prev, msg]))
    setLogado(true)
  }

  async function enviarMsg() {
    if (!novaMsg.trim() || !cliente) return
    const { data } = await mensagensAPI.enviar(cliente.id, 'cliente', cliente.nome, novaMsg.trim())
    setNovaMsg('')
  }

  const inp = { background:'var(--bg3)', border:'1px solid var(--border2)', borderRadius:7, padding:'9px 12px', color:'var(--text1)', fontSize:13, outline:'none', fontFamily:'DM Sans, sans-serif', width:'100%' }

  if (!logado) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'100vh', background:'var(--bg0)' }}>
      <div style={{ background:'var(--bg2)', border:'1px solid var(--border2)', borderRadius:14, padding:'32px 28px', width:320 }}>
        <div style={{ fontFamily:'Syne, sans-serif', fontSize:20, fontWeight:700, background:'linear-gradient(135deg,#4F7CFF,#7B5CFF)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', marginBottom:4 }}>FlowCRM</div>
        <div style={{ fontSize:12, color:'var(--text3)', marginBottom:24 }}>Portal do Cliente</div>
        <form onSubmit={handleLogin}>
          <label style={{ fontSize:11, color:'var(--text3)', display:'block', marginBottom:5 }}>E-MAIL</label>
          <input style={{...inp, marginBottom:12}} type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="seu@email.com.br" required />
          <label style={{ fontSize:11, color:'var(--text3)', display:'block', marginBottom:5 }}>SENHA / CÓDIGO DE ACESSO</label>
          <input style={{...inp, marginBottom:16}} type="password" value={senha} onChange={e => setSenha(e.target.value)} placeholder="••••••••" required />
          {erro && <div style={{ fontSize:11, color:'var(--red)', marginBottom:12, background:'rgba(255,91,91,0.08)', border:'1px solid rgba(255,91,91,0.2)', borderRadius:6, padding:'7px 10px' }}>{erro}</div>}
          <button type="submit" style={{ width:'100%', background:'var(--accent)', border:'none', borderRadius:7, padding:10, fontSize:13, fontWeight:500, color:'#fff', cursor:'pointer' }}>Entrar no portal</button>
        </form>
        <div style={{ fontSize:11, color:'var(--text3)', textAlign:'center', marginTop:12 }}>Problemas? Fale com a Flow Agency</div>
      </div>
    </div>
  )

  const navs = ['inicio','projetos','mensagens','financeiro']
  const navLabels = { inicio:'Início', projetos:'Meus Projetos', mensagens:'Mensagens', financeiro:'Financeiro' }

  return (
    <div style={{ minHeight:'100vh', background:'var(--bg0)', display:'flex', flexDirection:'column' }}>
      {/* Topbar */}
      <div style={{ background:'var(--bg1)', borderBottom:'1px solid var(--border)', padding:'0 20px', height:50, display:'flex', alignItems:'center', gap:12 }}>
        <div style={{ fontFamily:'Syne, sans-serif', fontSize:14, fontWeight:700, color:'var(--accent)' }}>FlowCRM</div>
        <div style={{ width:1, height:16, background:'var(--border2)' }}></div>
        <div style={{ fontSize:13, color:'var(--text2)' }}>Portal de <strong style={{ color:'var(--text1)', fontWeight:500 }}>{cliente?.nome}</strong></div>
        <div style={{ marginLeft:'auto', display:'flex', gap:4 }}>
          {navs.map(n => (
            <button key={n} onClick={() => setPview(n)}
              style={{ background:pview===n?'var(--bg3)':'none', border:'none', borderRadius:6, padding:'6px 12px', fontSize:12, color:pview===n?'var(--text1)':'var(--text3)', cursor:'pointer', fontFamily:'DM Sans, sans-serif' }}>
              {navLabels[n]}
            </button>
          ))}
        </div>
        <button onClick={() => setLogado(false)} style={{ background:'none', border:'1px solid var(--border2)', borderRadius:6, padding:'5px 10px', fontSize:11, color:'var(--text3)', cursor:'pointer' }}>Sair</button>
      </div>

      <div style={{ flex:1, padding:'20px', overflowY:'auto' }}>

        {/* Início */}
        {pview === 'inicio' && (
          <div>
            <div style={{ marginBottom:16 }}>
              <div style={{ fontFamily:'Syne, sans-serif', fontSize:16, fontWeight:600, marginBottom:3 }}>Olá, {cliente?.contato || cliente?.nome} 👋</div>
              <div style={{ fontSize:12, color:'var(--text3)' }}>Aqui está o resumo dos seus projetos com a Flow Agency</div>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10, marginBottom:16 }}>
              {[
                { label:'PROJETOS ATIVOS', value: projetos.filter(p => p.etapa === 'andamento').length, sub:'Em andamento', cor:'var(--accent)' },
                { label:'TAREFAS CONCLUÍDAS', value: projetos.flatMap(p => p.tarefas||[]).filter(t => t.concluida).length, sub:`de ${projetos.flatMap(p=>p.tarefas||[]).length} total`, cor:'var(--green)' },
                { label:'MRR', value: `R$ ${Number(cliente?.mrr||0).toLocaleString('pt-BR')}`, sub:'Recorrência mensal', cor:'var(--amber)' },
              ].map((c,i) => (
                <div key={i} style={{ background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:10, padding:'14px 16px' }}>
                  <div style={{ fontSize:10, color:'var(--text3)', marginBottom:5, letterSpacing:'0.3px' }}>{c.label}</div>
                  <div style={{ fontSize:20, fontWeight:600, fontFamily:'Syne, sans-serif', color:c.cor }}>{c.value}</div>
                  <div style={{ fontSize:11, color:'var(--text3)', marginTop:2 }}>{c.sub}</div>
                </div>
              ))}
            </div>
            <div style={{ background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:10, padding:16 }}>
              <div style={{ fontSize:11, color:'var(--text3)', fontWeight:500, letterSpacing:'0.3px', marginBottom:12 }}>SEUS PROJETOS</div>
              {projetos.length === 0 && <div style={{ fontSize:12, color:'var(--text3)' }}>Nenhum projeto ainda.</div>}
              {projetos.map(p => (
                <div key={p.id} style={{ display:'flex', alignItems:'center', padding:'8px 0', borderBottom:'1px solid var(--border)', gap:12 }}>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:12, fontWeight:500, color:'var(--text1)' }}>{p.nome}</div>
                    <div style={{ fontSize:10, color:'var(--text3)' }}>{p.servico}</div>
                  </div>
                  <div style={{ width:80, height:4, background:'var(--bg4)', borderRadius:2, overflow:'hidden' }}>
                    <div style={{ height:'100%', width:`${p.progresso||0}%`, background:'var(--accent)', borderRadius:2 }}></div>
                  </div>
                  <div style={{ fontSize:11, color:'var(--accent)', minWidth:32, textAlign:'right' }}>{p.progresso||0}%</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Projetos */}
        {pview === 'projetos' && (
          <div>
            <div style={{ fontFamily:'Syne, sans-serif', fontSize:15, fontWeight:600, marginBottom:14 }}>Meus Projetos</div>
            {projetos.map(p => {
              const totalT = (p.tarefas||[]).length
              const doneT = (p.tarefas||[]).filter(t => t.concluida).length
              return (
                <div key={p.id} style={{ background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:10, padding:16, marginBottom:12 }}>
                  <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:10 }}>
                    <div>
                      <div style={{ fontFamily:'Syne, sans-serif', fontSize:14, fontWeight:600 }}>{p.nome}</div>
                      <div style={{ fontSize:11, color:'var(--text3)', marginTop:2 }}>{p.servico}</div>
                    </div>
                    <span style={{ fontSize:10, padding:'3px 8px', borderRadius:4, fontWeight:500, background:p.etapa==='concluido'?'rgba(34,201,122,0.15)':p.etapa==='revisao'?'rgba(245,166,35,0.15)':'rgba(79,124,255,0.15)', color:p.etapa==='concluido'?'var(--green)':p.etapa==='revisao'?'var(--amber)':'var(--accent)' }}>
                      {p.etapa==='backlog'?'Aguardando':p.etapa==='andamento'?'Em andamento':p.etapa==='revisao'?'Em revisão':'Concluído'}
                    </span>
                  </div>
                  <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:12 }}>
                    <div style={{ flex:1, height:5, background:'var(--bg4)', borderRadius:3, overflow:'hidden' }}>
                      <div style={{ height:'100%', width:`${p.progresso||0}%`, background:'var(--accent)', borderRadius:3 }}></div>
                    </div>
                    <span style={{ fontSize:12, color:'var(--accent)', fontWeight:500 }}>{p.progresso||0}%</span>
                  </div>
                  {totalT > 0 && (
                    <div>
                      <div style={{ fontSize:10, color:'var(--text3)', marginBottom:6, letterSpacing:'0.3px' }}>TAREFAS ({doneT}/{totalT})</div>
                      {(p.tarefas||[]).map(t => (
                        <div key={t.id} style={{ display:'flex', alignItems:'center', gap:8, padding:'4px 0', borderBottom:'1px solid var(--border)' }}>
                          <div style={{ width:12, height:12, borderRadius:3, border:`1px solid ${t.concluida?'var(--green)':'var(--border2)'}`, background:t.concluida?'var(--green)':'transparent', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                            {t.concluida && <span style={{ color:'#fff', fontSize:8 }}>✓</span>}
                          </div>
                          <span style={{ fontSize:11, color:t.concluida?'var(--text3)':'var(--text2)', textDecoration:t.concluida?'line-through':'none' }}>{t.titulo}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* Mensagens */}
        {pview === 'mensagens' && (
          <div style={{ maxWidth:600 }}>
            <div style={{ fontFamily:'Syne, sans-serif', fontSize:15, fontWeight:600, marginBottom:14 }}>Mensagens com a Flow Agency</div>
            <div style={{ background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:10, padding:16, marginBottom:12, minHeight:200, maxHeight:360, overflowY:'auto', display:'flex', flexDirection:'column', gap:10 }}>
              {msgs.length === 0 && <div style={{ fontSize:12, color:'var(--text3)' }}>Nenhuma mensagem ainda.</div>}
              {msgs.map((m, i) => (
                <div key={i} style={{ display:'flex', gap:8, alignItems:'flex-start', flexDirection:m.remetente==='cliente'?'row-reverse':'row' }}>
                  <div style={{ width:28, height:28, borderRadius:'50%', background:m.remetente==='cliente'?'var(--green)':'var(--accent)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:600, color:'#fff', flexShrink:0 }}>
                    {(m.nome_remetente||'?').split(' ').map(w=>w[0]).join('').slice(0,2)}
                  </div>
                  <div style={{ maxWidth:'72%' }}>
                    <div style={{ background:m.remetente==='cliente'?'rgba(79,124,255,0.1)':'var(--bg3)', border:`1px solid ${m.remetente==='cliente'?'rgba(79,124,255,0.2)':'var(--border)'}`, borderRadius:10, padding:'9px 12px', fontSize:12, color:m.remetente==='cliente'?'var(--text1)':'var(--text2)', lineHeight:1.5 }}>{m.texto}</div>
                    <div style={{ fontSize:10, color:'var(--text3)', marginTop:2, textAlign:m.remetente==='cliente'?'right':'left' }}>{m.nome_remetente} · {new Date(m.criado_em).toLocaleDateString('pt-BR')}</div>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ display:'flex', gap:8 }}>
              <input value={novaMsg} onChange={e => setNovaMsg(e.target.value)} onKeyDown={e => e.key==='Enter'&&enviarMsg()} placeholder="Digite sua mensagem..." style={{ flex:1, background:'var(--bg2)', border:'1px solid var(--border2)', borderRadius:8, padding:'9px 12px', color:'var(--text1)', fontSize:12, outline:'none' }}/>
              <button onClick={enviarMsg} style={{ background:'var(--accent)', border:'none', borderRadius:8, padding:'9px 18px', fontSize:12, color:'#fff', cursor:'pointer', fontWeight:500 }}>Enviar</button>
            </div>
          </div>
        )}

        {/* Financeiro */}
        {pview === 'financeiro' && (
          <div style={{ maxWidth:500 }}>
            <div style={{ fontFamily:'Syne, sans-serif', fontSize:15, fontWeight:600, marginBottom:14 }}>Financeiro</div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:14 }}>
              <div style={{ background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:10, padding:'14px 16px' }}>
                <div style={{ fontSize:10, color:'var(--text3)', marginBottom:5 }}>PLANO ATUAL</div>
                <div style={{ fontSize:13, fontWeight:600, color:'var(--accent)' }}>{cliente?.segmento || 'Flow Agency'}</div>
              </div>
              <div style={{ background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:10, padding:'14px 16px' }}>
                <div style={{ fontSize:10, color:'var(--text3)', marginBottom:5 }}>MENSALIDADE</div>
                <div style={{ fontFamily:'Syne, sans-serif', fontSize:18, fontWeight:600, color:'var(--green)' }}>R$ {Number(cliente?.mrr||0).toLocaleString('pt-BR')}</div>
              </div>
            </div>
            <div style={{ background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:10, padding:16 }}>
              <div style={{ fontSize:11, color:'var(--text3)', fontWeight:500, letterSpacing:'0.3px', marginBottom:12 }}>Para detalhes de cobranças, entre em contato com a Flow Agency via Mensagens.</div>
              <button onClick={() => setPview('mensagens')} style={{ background:'var(--accent)', border:'none', borderRadius:7, padding:'8px 16px', fontSize:12, fontWeight:500, color:'#fff', cursor:'pointer' }}>Ir para Mensagens</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
