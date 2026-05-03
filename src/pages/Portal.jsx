import React, { useState, useEffect } from 'react'
import { supabase, mensagensAPI } from '../lib/supabase.js'

export default function Portal() {
  const [logado, setLogado]       = useState(false)
  const [email, setEmail]         = useState('')
  const [senha, setSenha]         = useState('')
  const [erro, setErro]           = useState('')
  const [loading, setLoading]     = useState(false)
  const [pview, setPview]         = useState('inicio')
  const [perfil, setPerfil]       = useState(null) // { tipo: 'cliente'|'colaborador', dados: {...} }
  const [projetos, setProjetos]   = useState([])
  const [msgs, setMsgs]           = useState([])
  const [novaMsg, setNovaMsg]     = useState('')
  const [clientes, setClientes]   = useState([])

  async function handleLogin(e) {
    e.preventDefault()
    setErro('')
    setLoading(true)

    // 1. Tentar como CLIENTE (pelo e-mail)
    const { data: cliente } = await supabase
      .from('clientes')
      .select('*')
      .eq('email', email.trim())
      .single()

    if (cliente) {
      // Carregar projetos do cliente
      const { data: p } = await supabase
        .from('projetos')
        .select('*, tarefas(*), entregas(*)')
        .eq('cliente_id', cliente.id)
      const { data: m } = await mensagensAPI.listar(cliente.id)
      mensagensAPI.assinar(cliente.id, msg => setMsgs(prev => [...prev, msg]))
      setPerfil({ tipo: 'cliente', dados: cliente })
      setProjetos(p || [])
      setMsgs(m || [])
      setLogado(true)
      setLoading(false)
      return
    }

    // 2. Tentar como COLABORADOR (pelo portal_email)
    const { data: colab } = await supabase
      .from('colaboradores')
      .select('*')
      .eq('portal_email', email.trim())
      .eq('ativo', true)
      .single()

    if (colab) {
      // Carregar projetos vinculados ao colaborador
      const { data: cp } = await supabase
        .from('colaborador_projetos')
        .select('projeto_id')
        .eq('colaborador_id', colab.id)

      let projetosColab = []
      if (cp && cp.length > 0) {
        const ids = cp.map(x => x.projeto_id)
        const { data: p } = await supabase
          .from('projetos')
          .select('*, clientes(nome, cor, iniciais), tarefas(*)')
          .in('id', ids)
        projetosColab = p || []
      }

      // Carregar clientes da agência (colaboradores veem todos)
      const { data: cl } = await supabase
        .from('clientes')
        .select('id, nome, status, mrr, segmento')
        .order('nome')

      setPerfil({ tipo: 'colaborador', dados: colab })
      setProjetos(projetosColab)
      setClientes(cl || [])
      setLogado(true)
      setLoading(false)
      return
    }

    setErro('E-mail não encontrado. Verifique com a agência.')
    setLoading(false)
  }

  async function enviarMsg() {
    if (!novaMsg.trim() || perfil?.tipo !== 'cliente') return
    await mensagensAPI.enviar(perfil.dados.id, 'cliente', perfil.dados.nome, novaMsg.trim())
    setNovaMsg('')
  }

  const inp = {
    background:'var(--bg3)', border:'1px solid var(--border2)', borderRadius:7,
    padding:'9px 12px', color:'var(--text1)', fontSize:13, outline:'none',
    fontFamily:'DM Sans, sans-serif', width:'100%',
  }

  // ── TELA DE LOGIN ───────────────────────────────────────────────
  if (!logado) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'100vh', background:'var(--bg0)' }}>
      <div style={{ background:'var(--bg2)', border:'1px solid var(--border2)', borderRadius:14, padding:'32px 28px', width:340 }}>
        <div style={{ fontFamily:'Syne, sans-serif', fontSize:22, fontWeight:700, background:'linear-gradient(135deg,#4F7CFF,#7B5CFF)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', marginBottom:4 }}>
          FlowCRM
        </div>
        <div style={{ fontSize:12, color:'var(--text3)', marginBottom:24 }}>Portal de Acesso</div>

        <form onSubmit={handleLogin}>
          <label style={{ fontSize:11, color:'var(--text3)', display:'block', marginBottom:5 }}>E-MAIL</label>
          <input style={{ ...inp, marginBottom:12 }} type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="seu@email.com.br" required/>
          <label style={{ fontSize:11, color:'var(--text3)', display:'block', marginBottom:5 }}>CÓDIGO DE ACESSO</label>
          <input style={{ ...inp, marginBottom:16 }} type="password" value={senha} onChange={e => setSenha(e.target.value)} placeholder="••••••••" required/>
          {erro && (
            <div style={{ fontSize:11, color:'var(--red)', marginBottom:12, background:'rgba(255,91,91,0.08)', border:'1px solid rgba(255,91,91,0.2)', borderRadius:6, padding:'8px 12px' }}>
              {erro}
            </div>
          )}
          <button type="submit" disabled={loading}
            style={{ width:'100%', background:'var(--accent)', border:'none', borderRadius:7, padding:10, fontSize:13, fontWeight:500, color:'#fff', cursor:'pointer', opacity:loading?0.7:1 }}>
            {loading ? 'Verificando...' : 'Entrar no portal'}
          </button>
        </form>

        <div style={{ fontSize:11, color:'var(--text3)', textAlign:'center', marginTop:14 }}>
          Problemas? Fale com a Flow Agency
        </div>

        {/* Indicador de tipo de acesso */}
        <div style={{ marginTop:16, display:'flex', gap:6 }}>
          <div style={{ flex:1, background:'rgba(79,124,255,0.08)', border:'1px solid rgba(79,124,255,0.2)', borderRadius:7, padding:'8px 10px', textAlign:'center' }}>
            <div style={{ fontSize:10, color:'var(--accent)', fontWeight:500 }}>🏢 Clientes</div>
            <div style={{ fontSize:10, color:'var(--text3)', marginTop:1 }}>Acompanhe seus projetos</div>
          </div>
          <div style={{ flex:1, background:'rgba(123,92,255,0.08)', border:'1px solid rgba(123,92,255,0.2)', borderRadius:7, padding:'8px 10px', textAlign:'center' }}>
            <div style={{ fontSize:10, color:'var(--accent2)', fontWeight:500 }}>👥 Colaboradores</div>
            <div style={{ fontSize:10, color:'var(--text3)', marginTop:1 }}>Acesse sua área de trabalho</div>
          </div>
        </div>
      </div>
    </div>
  )

  const navs = perfil?.tipo === 'cliente'
    ? ['inicio','projetos','mensagens','financeiro']
    : ['inicio','projetos','clientes']

  const navLabels = {
    inicio:'Início', projetos:'Projetos', mensagens:'Mensagens',
    financeiro:'Financeiro', clientes:'Clientes',
  }

  const nomeExibido = perfil?.tipo === 'cliente'
    ? perfil.dados.contato || perfil.dados.nome
    : perfil?.dados.nome

  // ── PORTAL ──────────────────────────────────────────────────────
  return (
    <div style={{ minHeight:'100vh', background:'var(--bg0)', display:'flex', flexDirection:'column' }}>
      {/* Topbar */}
      <div style={{ background:'var(--bg1)', borderBottom:'1px solid var(--border)', padding:'0 20px', height:50, display:'flex', alignItems:'center', gap:12 }}>
        <div style={{ fontFamily:'Syne, sans-serif', fontSize:14, fontWeight:700, color:'var(--accent)' }}>FlowCRM</div>
        <div style={{ width:1, height:16, background:'var(--border2)' }}></div>
        {/* Badge tipo de usuário */}
        <div style={{ fontSize:11, padding:'2px 8px', borderRadius:4, background: perfil?.tipo==='colaborador' ? 'rgba(123,92,255,0.15)' : 'rgba(79,124,255,0.15)', color: perfil?.tipo==='colaborador' ? 'var(--accent2)' : 'var(--accent)', fontWeight:500 }}>
          {perfil?.tipo === 'colaborador' ? '👥 Colaborador' : '🏢 Cliente'}
        </div>
        <div style={{ fontSize:13, color:'var(--text2)' }}>
          Olá, <strong style={{ color:'var(--text1)', fontWeight:500 }}>{nomeExibido}</strong>
        </div>
        <div style={{ marginLeft:'auto', display:'flex', gap:4 }}>
          {navs.map(n => (
            <button key={n} onClick={() => setPview(n)}
              style={{ background:pview===n?'var(--bg3)':'none', border:'none', borderRadius:6, padding:'6px 12px', fontSize:12, color:pview===n?'var(--text1)':'var(--text3)', cursor:'pointer', fontFamily:'DM Sans, sans-serif' }}>
              {navLabels[n]}
            </button>
          ))}
        </div>
        <button onClick={() => { setLogado(false); setPerfil(null); setEmail(''); setSenha('') }}
          style={{ background:'none', border:'1px solid var(--border2)', borderRadius:6, padding:'5px 10px', fontSize:11, color:'var(--text3)', cursor:'pointer' }}>
          Sair
        </button>
      </div>

      <div style={{ flex:1, padding:'20px', overflowY:'auto', maxWidth:760, margin:'0 auto', width:'100%' }}>

        {/* ── INÍCIO ─────────────────────────────────────────────── */}
        {pview === 'inicio' && (
          <div>
            <div style={{ marginBottom:18 }}>
              <div style={{ fontFamily:'Syne, sans-serif', fontSize:16, fontWeight:600, marginBottom:3 }}>
                Olá, {nomeExibido} 👋
              </div>
              <div style={{ fontSize:12, color:'var(--text3)' }}>
                {perfil?.tipo === 'colaborador'
                  ? `Bem-vindo à sua área de trabalho — ${perfil.dados.cargo || 'Colaborador'}`
                  : 'Aqui está o resumo dos seus projetos com a Flow Agency'}
              </div>
            </div>

            {/* Cards de métricas */}
            <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10, marginBottom:18 }}>
              {perfil?.tipo === 'cliente' ? [
                { label:'PROJETOS ATIVOS', value: projetos.filter(p=>p.etapa==='andamento').length, sub:'Em andamento', cor:'var(--accent)' },
                { label:'TAREFAS CONCLUÍDAS', value: projetos.flatMap(p=>p.tarefas||[]).filter(t=>t.concluida).length, sub:`de ${projetos.flatMap(p=>p.tarefas||[]).length} total`, cor:'var(--green)' },
                { label:'MENSALIDADE', value:`R$ ${Number(perfil.dados.mrr||0).toLocaleString('pt-BR')}`, sub:'Recorrência mensal', cor:'var(--amber)' },
              ] : [
                { label:'PROJETOS VINCULADOS', value: projetos.length, sub:'Total', cor:'var(--accent)' },
                { label:'CLIENTES DA AGÊNCIA', value: clientes.length, sub:'Cadastrados', cor:'var(--green)' },
                { label:'CARGO', value: perfil.dados.cargo || '—', sub:'Função', cor:'var(--accent2)' },
              ].map((c,i) => (
                <div key={i} style={{ background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:10, padding:'14px 16px' }}>
                  <div style={{ fontSize:10, color:'var(--text3)', marginBottom:5, letterSpacing:'0.3px' }}>{c.label}</div>
                  <div style={{ fontFamily:'Syne, sans-serif', fontSize:20, fontWeight:600, color:c.cor }}>{c.value}</div>
                  <div style={{ fontSize:11, color:'var(--text3)', marginTop:2 }}>{c.sub}</div>
                </div>
              ))}
            </div>

            {/* Projetos resumo */}
            <div style={{ background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:10, padding:16 }}>
              <div style={{ fontSize:11, color:'var(--text3)', fontWeight:500, letterSpacing:'0.3px', marginBottom:12 }}>
                {perfil?.tipo === 'colaborador' ? 'PROJETOS ATRIBUÍDOS' : 'SEUS PROJETOS'}
              </div>
              {projetos.length === 0 && (
                <div style={{ fontSize:12, color:'var(--text3)', textAlign:'center', padding:20 }}>
                  {perfil?.tipo === 'colaborador' ? 'Nenhum projeto atribuído ainda.' : 'Nenhum projeto ainda.'}
                </div>
              )}
              {projetos.map(p => (
                <div key={p.id} style={{ display:'flex', alignItems:'center', padding:'8px 0', borderBottom:'1px solid var(--border)', gap:12 }}>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:12, fontWeight:500, color:'var(--text1)' }}>{p.nome}</div>
                    <div style={{ fontSize:10, color:'var(--text3)' }}>
                      {p.servico}
                      {perfil?.tipo === 'colaborador' && p.clientes && ` · ${p.clientes.nome}`}
                    </div>
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

        {/* ── PROJETOS ───────────────────────────────────────────── */}
        {pview === 'projetos' && (
          <div>
            <div style={{ fontFamily:'Syne, sans-serif', fontSize:15, fontWeight:600, marginBottom:14 }}>
              {perfil?.tipo === 'colaborador' ? 'Projetos Atribuídos' : 'Meus Projetos'}
            </div>
            {projetos.length === 0 && (
              <div style={{ background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:10, padding:40, textAlign:'center', color:'var(--text3)', fontSize:12 }}>
                {perfil?.tipo === 'colaborador' ? 'Nenhum projeto atribuído.' : 'Nenhum projeto ainda.'}
              </div>
            )}
            {projetos.map(p => {
              const totalT = (p.tarefas||[]).length
              const doneT = (p.tarefas||[]).filter(t=>t.concluida).length
              return (
                <div key={p.id} style={{ background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:10, padding:16, marginBottom:12 }}>
                  <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:10 }}>
                    <div>
                      <div style={{ fontFamily:'Syne, sans-serif', fontSize:14, fontWeight:600 }}>{p.nome}</div>
                      <div style={{ fontSize:11, color:'var(--text3)', marginTop:2 }}>
                        {p.servico}
                        {perfil?.tipo === 'colaborador' && p.clientes && ` · Cliente: ${p.clientes.nome}`}
                      </div>
                    </div>
                    <span style={{ fontSize:10, padding:'3px 8px', borderRadius:4, fontWeight:500,
                      background:p.etapa==='concluido'?'rgba(34,201,122,0.15)':p.etapa==='revisao'?'rgba(245,166,35,0.15)':'rgba(79,124,255,0.15)',
                      color:p.etapa==='concluido'?'var(--green)':p.etapa==='revisao'?'var(--amber)':'var(--accent)' }}>
                      {p.etapa==='backlog'?'Aguardando':p.etapa==='andamento'?'Em andamento':p.etapa==='revisao'?'Em revisão':'Concluído'}
                    </span>
                  </div>
                  <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:totalT>0?12:0 }}>
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

        {/* ── MENSAGENS (só clientes) ─────────────────────────────── */}
        {pview === 'mensagens' && perfil?.tipo === 'cliente' && (
          <div style={{ maxWidth:600 }}>
            <div style={{ fontFamily:'Syne, sans-serif', fontSize:15, fontWeight:600, marginBottom:14 }}>Mensagens com a Flow Agency</div>
            <div style={{ background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:10, padding:16, marginBottom:12, minHeight:200, maxHeight:360, overflowY:'auto', display:'flex', flexDirection:'column', gap:10 }}>
              {msgs.length === 0 && <div style={{ fontSize:12, color:'var(--text3)' }}>Nenhuma mensagem ainda.</div>}
              {msgs.map((m,i) => (
                <div key={i} style={{ display:'flex', gap:8, alignItems:'flex-start', flexDirection:m.remetente==='cliente'?'row-reverse':'row' }}>
                  <div style={{ width:28, height:28, borderRadius:'50%', background:m.remetente==='cliente'?'var(--green)':'var(--accent)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:600, color:'#fff', flexShrink:0 }}>
                    {(m.nome_remetente||'?').split(' ').map(w=>w[0]).join('').slice(0,2)}
                  </div>
                  <div style={{ maxWidth:'72%' }}>
                    <div style={{ background:m.remetente==='cliente'?'rgba(79,124,255,0.1)':'var(--bg3)', border:`1px solid ${m.remetente==='cliente'?'rgba(79,124,255,0.2)':'var(--border)'}`, borderRadius:10, padding:'9px 12px', fontSize:12, color:m.remetente==='cliente'?'var(--text1)':'var(--text2)', lineHeight:1.5 }}>
                      {m.texto}
                    </div>
                    <div style={{ fontSize:10, color:'var(--text3)', marginTop:2, textAlign:m.remetente==='cliente'?'right':'left' }}>
                      {m.nome_remetente} · {new Date(m.criado_em).toLocaleDateString('pt-BR')}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ display:'flex', gap:8 }}>
              <input value={novaMsg} onChange={e => setNovaMsg(e.target.value)} onKeyDown={e => e.key==='Enter'&&enviarMsg()}
                placeholder="Digite sua mensagem..." style={{ flex:1, background:'var(--bg2)', border:'1px solid var(--border2)', borderRadius:8, padding:'9px 12px', color:'var(--text1)', fontSize:12, outline:'none' }}/>
              <button onClick={enviarMsg} style={{ background:'var(--accent)', border:'none', borderRadius:8, padding:'9px 18px', fontSize:12, color:'#fff', cursor:'pointer', fontWeight:500 }}>Enviar</button>
            </div>
          </div>
        )}

        {/* ── FINANCEIRO (só clientes) ────────────────────────────── */}
        {pview === 'financeiro' && perfil?.tipo === 'cliente' && (
          <div style={{ maxWidth:500 }}>
            <div style={{ fontFamily:'Syne, sans-serif', fontSize:15, fontWeight:600, marginBottom:14 }}>Financeiro</div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:14 }}>
              <div style={{ background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:10, padding:'14px 16px' }}>
                <div style={{ fontSize:10, color:'var(--text3)', marginBottom:5 }}>SEGMENTO</div>
                <div style={{ fontSize:13, fontWeight:600, color:'var(--accent)' }}>{perfil.dados.segmento || '—'}</div>
              </div>
              <div style={{ background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:10, padding:'14px 16px' }}>
                <div style={{ fontSize:10, color:'var(--text3)', marginBottom:5 }}>MENSALIDADE</div>
                <div style={{ fontFamily:'Syne, sans-serif', fontSize:18, fontWeight:600, color:'var(--green)' }}>R$ {Number(perfil.dados.mrr||0).toLocaleString('pt-BR')}</div>
              </div>
            </div>
            <div style={{ background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:10, padding:16 }}>
              <div style={{ fontSize:12, color:'var(--text2)', lineHeight:1.7, marginBottom:12 }}>
                Para detalhes completos de cobranças, notas fiscais ou dúvidas financeiras, entre em contato com a Flow Agency diretamente pelo chat de mensagens.
              </div>
              <button onClick={() => setPview('mensagens')}
                style={{ background:'var(--accent)', border:'none', borderRadius:7, padding:'8px 16px', fontSize:12, fontWeight:500, color:'#fff', cursor:'pointer' }}>
                Ir para Mensagens
              </button>
            </div>
          </div>
        )}

        {/* ── CLIENTES (só colaboradores) ─────────────────────────── */}
        {pview === 'clientes' && perfil?.tipo === 'colaborador' && (
          <div>
            <div style={{ fontFamily:'Syne, sans-serif', fontSize:15, fontWeight:600, marginBottom:14 }}>Clientes da Agência</div>
            <div style={{ background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:10, overflow:'hidden' }}>
              <table style={{ width:'100%', borderCollapse:'collapse' }}>
                <thead>
                  <tr>
                    {['Cliente','Segmento','Status','MRR'].map(h => (
                      <th key={h} style={{ fontSize:10, color:'var(--text3)', textAlign:'left', padding:'8px 12px', borderBottom:'1px solid var(--border)', fontWeight:500 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {clientes.map(c => (
                    <tr key={c.id} style={{ borderBottom:'1px solid var(--border)' }}>
                      <td style={{ padding:'9px 12px', fontSize:12, fontWeight:500, color:'var(--text1)' }}>{c.nome}</td>
                      <td style={{ padding:'9px 12px', fontSize:11, color:'var(--text2)' }}>{c.segmento||'—'}</td>
                      <td style={{ padding:'9px 12px' }}>
                        <span style={{ fontSize:10, padding:'2px 7px', borderRadius:4, fontWeight:500,
                          background:c.status==='ativo'?'rgba(34,201,122,0.15)':'rgba(79,124,255,0.15)',
                          color:c.status==='ativo'?'var(--green)':'var(--accent)' }}>
                          {c.status}
                        </span>
                      </td>
                      <td style={{ padding:'9px 12px', fontSize:12, fontWeight:600, color:'var(--green)', fontFamily:'Syne, sans-serif' }}>
                        {c.mrr > 0 ? `R$ ${Number(c.mrr).toLocaleString('pt-BR')}` : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
