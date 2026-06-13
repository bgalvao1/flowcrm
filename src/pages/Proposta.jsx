import React, { useState } from 'react'
import { propostasAPI, clientesAPI } from '../lib/supabase.js'

const SERVICOS = ['Tráfego Pago','Criação de Site','Landing Page','Agente IA Atendimento','App Mobile','SaaS / Sistema','Consultoria Digital','Gestão de Redes Sociais','SEO / Conteúdo']

export default function Proposta() {
  const [step, setStep] = useState(1)
  const [selectedServices, setSelectedServices] = useState([])
  const [form, setForm] = useState({ cliente:'', segmento:'', contato:'', dor:'', detalhes:'', modelo:'Projeto único', prazo:'30 dias', valor:'', mensalidade:'0', validade:'7 dias' })
  const [resultado, setResultado] = useState('')
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)

  const toggleServico = (s) => setSelectedServices(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s])

  async function gerar() {
    setLoading(true)
    setStep(4)
    setResultado('')

    const prompt = `Você é especialista em propostas comerciais para agências digitais brasileiras. Crie uma proposta profissional e persuasiva:

Cliente: ${form.cliente}
Segmento: ${form.segmento}
Contato: ${form.contato}
Serviços: ${selectedServices.join(', ')}
Modelo: ${form.modelo}
Prazo: ${form.prazo}
Valor do projeto: R$ ${parseFloat(form.valor||0).toLocaleString('pt-BR')}
Mensalidade: R$ ${parseFloat(form.mensalidade||0).toLocaleString('pt-BR')}
Validade: ${form.validade}
Dor/Objetivo: ${form.dor}
Detalhes: ${form.detalhes}

Estruture a proposta com: 1) Apresentação personalizada, 2) Diagnóstico, 3) Solução proposta, 4) O que está incluído, 5) Investimento, 6) Por que escolher a Flow Agency (3 diferenciais), 7) Próximos passos. Tom profissional, direto e confiante. Linguagem brasileira.`

    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'claude-sonnet-4-20250514', max_tokens: 1200, messages: [{ role: 'user', content: prompt }] })
      })
      const data = await res.json()
      const text = data.content?.[0]?.text || 'Erro ao gerar proposta.'
      setResultado(text)
    } catch {
      setResultado('Erro ao conectar com a IA.')
    } finally {
      setLoading(false)
    }
  }

  async function salvar() {
    if (!resultado) return
    await propostasAPI.criar({
      cliente_nome: form.cliente,
      segmento: form.segmento,
      servicos: selectedServices,
      modelo_cobranca: form.modelo,
      prazo_entrega: form.prazo,
      valor_projeto: parseFloat(form.valor) || 0,
      mensalidade: parseFloat(form.mensalidade) || 0,
      validade: form.validade,
      conteudo: resultado,
    })
    setSaved(true)
  }

  const inp = { width:'100%', background:'var(--bg3)', border:'1px solid var(--border2)', borderRadius:7, padding:'8px 12px', color:'var(--text1)', fontSize:12, outline:'none', fontFamily:'DM Sans, sans-serif' }
  const lbl = { fontSize:11, color:'var(--text3)', display:'block', marginBottom:4, letterSpacing:'0.3px' }

  // Steps indicator
  const steps = ['Dados do cliente','Serviços','Valores','Proposta']

  return (
    <div style={{ maxWidth:680, margin:'0 auto' }}>
      <div style={{ marginBottom:20 }}>
        <h1 className="page-title">Gerador de Proposta com IA</h1>
        <div style={{ fontSize:12, color:'var(--text3)', marginTop:2 }}>Preencha os dados e a IA monta a proposta completa</div>
      </div>

      {/* Steps */}
      <div style={{ display:'flex', alignItems:'center', gap:0, marginBottom:20 }}>
        {steps.map((s, i) => (
          <React.Fragment key={i}>
            <div style={{ display:'flex', alignItems:'center', gap:6, fontSize:11, fontWeight:500, color: step > i+1 ? 'var(--green)' : step === i+1 ? 'var(--accent)' : 'var(--text3)' }}>
              <div style={{ width:20, height:20, borderRadius:'50%', border:`1px solid currentColor`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, background: step > i+1 ? 'var(--green)' : step === i+1 ? 'var(--accent)' : 'transparent', color: step > i+1 || step === i+1 ? '#fff' : 'currentColor' }}>
                {step > i+1 ? '✓' : i+1}
              </div>
              {s}
            </div>
            {i < steps.length - 1 && <div style={{ flex:1, height:1, background:'var(--border2)', margin:'0 8px', minWidth:16 }}></div>}
          </React.Fragment>
        ))}
      </div>

      {/* Step 1 */}
      {step === 1 && (
        <div style={{ background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:10, padding:18 }}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:12 }}>
            <div><label style={lbl}>NOME DO CLIENTE / EMPRESA *</label><input style={inp} value={form.cliente} onChange={e => setForm({...form, cliente:e.target.value})} placeholder="Ex: Clínica Vitalle"/></div>
            <div><label style={lbl}>SEGMENTO</label>
              <select style={inp} value={form.segmento} onChange={e => setForm({...form, segmento:e.target.value})}>
                <option value="">Selecione...</option>
                {['Saúde','Educação','Varejo','Alimentação','Automotivo','Jurídico','Beleza & Estética','Construção Civil','Turismo','B2B / Indústria','Outro'].map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div><label style={lbl}>RESPONSÁVEL / CONTATO</label><input style={inp} value={form.contato} onChange={e => setForm({...form, contato:e.target.value})} placeholder="Ex: Dr. Carlos Lima"/></div>
          </div>
          <div><label style={lbl}>PRINCIPAL DOR / OBJETIVO DO CLIENTE</label><textarea style={{...inp, resize:'none'}} rows={3} value={form.dor} onChange={e => setForm({...form, dor:e.target.value})} placeholder="Ex: Precisa aumentar agendamentos, não tem presença digital..."/></div>
          <div style={{ display:'flex', justifyContent:'flex-end', marginTop:16 }}>
            <button onClick={() => setStep(2)} disabled={!form.cliente} style={{ background:'var(--accent)', border:'none', borderRadius:7, padding:'8px 20px', fontSize:12, fontWeight:500, color:'#fff', cursor:'pointer', opacity:!form.cliente?0.5:1 }}>Próximo →</button>
          </div>
        </div>
      )}

      {/* Step 2 */}
      {step === 2 && (
        <div style={{ background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:10, padding:18 }}>
          <div style={{ fontSize:11, color:'var(--text3)', fontWeight:500, letterSpacing:'0.3px', marginBottom:10 }}>SELECIONE OS SERVIÇOS</div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8, marginBottom:14 }}>
            {SERVICOS.map(s => (
              <div key={s} onClick={() => toggleServico(s)}
                style={{ background:selectedServices.includes(s)?'rgba(79,124,255,0.1)':'var(--bg3)', border:`1px solid ${selectedServices.includes(s)?'var(--accent)':'var(--border2)'}`, borderRadius:8, padding:'9px 10px', cursor:'pointer', textAlign:'center', transition:'all 0.15s' }}>
                <div style={{ fontSize:11, fontWeight:500, color:selectedServices.includes(s)?'var(--accent)':'var(--text2)' }}>{s}</div>
              </div>
            ))}
          </div>
          <div><label style={lbl}>DETALHES ADICIONAIS (opcional)</label><textarea style={{...inp, resize:'none'}} rows={2} value={form.detalhes} onChange={e => setForm({...form, detalhes:e.target.value})} placeholder="Ex: Site com área de membros, integração WhatsApp..."/></div>
          <div style={{ display:'flex', justifyContent:'space-between', marginTop:16 }}>
            <button onClick={() => setStep(1)} style={{ background:'none', border:'1px solid var(--border2)', borderRadius:7, padding:'7px 16px', fontSize:12, color:'var(--text2)', cursor:'pointer' }}>← Voltar</button>
            <button onClick={() => setStep(3)} disabled={selectedServices.length === 0} style={{ background:'var(--accent)', border:'none', borderRadius:7, padding:'8px 20px', fontSize:12, fontWeight:500, color:'#fff', cursor:'pointer', opacity:selectedServices.length===0?0.5:1 }}>Próximo →</button>
          </div>
        </div>
      )}

      {/* Step 3 */}
      {step === 3 && (
        <div style={{ background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:10, padding:18 }}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:12 }}>
            <div><label style={lbl}>MODELO DE COBRANÇA</label>
              <select style={inp} value={form.modelo} onChange={e => setForm({...form, modelo:e.target.value})}>
                {['Projeto único','Recorrência mensal','Projeto + Recorrência','Por hora'].map(m => <option key={m}>{m}</option>)}
              </select>
            </div>
            <div><label style={lbl}>PRAZO DE ENTREGA</label>
              <select style={inp} value={form.prazo} onChange={e => setForm({...form, prazo:e.target.value})}>
                {['7 dias','15 dias','30 dias','45 dias','60 dias','A definir'].map(p => <option key={p}>{p}</option>)}
              </select>
            </div>
            <div><label style={lbl}>VALOR DO PROJETO (R$)</label><input style={inp} type="number" value={form.valor} onChange={e => setForm({...form, valor:e.target.value})} placeholder="3500"/></div>
            <div><label style={lbl}>MENSALIDADE (R$)</label><input style={inp} type="number" value={form.mensalidade} onChange={e => setForm({...form, mensalidade:e.target.value})} placeholder="0"/></div>
            <div><label style={lbl}>VALIDADE DA PROPOSTA</label>
              <select style={inp} value={form.validade} onChange={e => setForm({...form, validade:e.target.value})}>
                {['5 dias','7 dias','10 dias','15 dias'].map(v => <option key={v}>{v}</option>)}
              </select>
            </div>
          </div>
          {/* Preview valor */}
          {(form.valor || form.mensalidade) && (
            <div style={{ display:'flex', gap:10, marginBottom:12 }}>
              {form.valor && <div style={{ background:'var(--bg3)', border:'1px solid var(--border2)', borderRadius:7, padding:'8px 14px', flex:1, textAlign:'center' }}>
                <div style={{ fontSize:10, color:'var(--text3)', marginBottom:3 }}>Projeto</div>
                <div style={{ fontFamily:'var(--font-display)', fontSize:16, fontWeight:600, color:'var(--green)' }}>R$ {parseFloat(form.valor).toLocaleString('pt-BR')}</div>
              </div>}
              {form.mensalidade > 0 && <div style={{ background:'var(--bg3)', border:'1px solid var(--border2)', borderRadius:7, padding:'8px 14px', flex:1, textAlign:'center' }}>
                <div style={{ fontSize:10, color:'var(--text3)', marginBottom:3 }}>Mensalidade</div>
                <div style={{ fontFamily:'var(--font-display)', fontSize:16, fontWeight:600, color:'var(--green)' }}>R$ {parseFloat(form.mensalidade).toLocaleString('pt-BR')}/mês</div>
              </div>}
            </div>
          )}
          <div style={{ display:'flex', justifyContent:'space-between', marginTop:8 }}>
            <button onClick={() => setStep(2)} style={{ background:'none', border:'1px solid var(--border2)', borderRadius:7, padding:'7px 16px', fontSize:12, color:'var(--text2)', cursor:'pointer' }}>← Voltar</button>
            <button onClick={gerar} style={{ background:'var(--accent)', border:'none', borderRadius:7, padding:'8px 20px', fontSize:12, fontWeight:500, color:'#fff', cursor:'pointer' }}>✦ Gerar com IA</button>
          </div>
        </div>
      )}

      {/* Step 4 — Resultado */}
      {step === 4 && (
        <div>
          <div style={{ background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:10, padding:18, marginBottom:12 }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
              <div style={{ fontFamily:'var(--font-display)', fontSize:14, fontWeight:600 }}>{loading ? 'Gerando proposta com IA...' : 'Proposta gerada com sucesso ✓'}</div>
              {!loading && !saved && (
                <div style={{ display:'flex', gap:8 }}>
                  <button onClick={() => setStep(3)} style={{ background:'none', border:'1px solid var(--border2)', borderRadius:7, padding:'6px 12px', fontSize:11, color:'var(--text2)', cursor:'pointer' }}>Editar dados</button>
                  <button onClick={salvar} style={{ background:'var(--green)', border:'none', borderRadius:7, padding:'6px 14px', fontSize:11, fontWeight:500, color:'#fff', cursor:'pointer' }}>Salvar no CRM</button>
                </div>
              )}
              {saved && <span style={{ fontSize:11, color:'var(--green)', fontWeight:500 }}>✓ Salvo no CRM</span>}
            </div>
            {loading && (
              <div style={{ display:'flex', gap:5, padding:'20px 0' }}>
                {[0,200,400].map(d => <div key={d} style={{ width:6, height:6, borderRadius:'50%', background:'var(--accent)', animation:'pulse 1.2s ease-in-out infinite', animationDelay:`${d}ms` }}></div>)}
                <style>{`@keyframes pulse{0%,80%,100%{opacity:.3}40%{opacity:1}}`}</style>
              </div>
            )}
            {resultado && (
              <div style={{ fontSize:13, color:'var(--text2)', lineHeight:1.8, whiteSpace:'pre-wrap', maxHeight:400, overflowY:'auto' }}>{resultado}</div>
            )}
          </div>
          {!loading && resultado && (
            <div style={{ background:'var(--bg1)', border:'1px solid var(--border)', borderRadius:12, padding:20 }}>
              <div style={{ fontFamily:'var(--font-display)', fontSize:18, fontWeight:700, color:'var(--accent)', marginBottom:2 }}>Flow Agency</div>
              <div style={{ fontSize:10, color:'var(--text3)', marginBottom:16 }}>Proposta Comercial · {new Date().toLocaleDateString('pt-BR')}</div>
              <div style={{ fontSize:11, color:'var(--text3)', fontWeight:500, letterSpacing:'0.5px', borderBottom:'1px solid var(--border2)', paddingBottom:6, marginBottom:10 }}>RESUMO FINANCEIRO</div>
              <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
                <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, padding:'5px 0', borderBottom:'1px solid var(--border)' }}><span style={{ color:'var(--text2)' }}>Cliente</span><span style={{ color:'var(--text1)', fontWeight:500 }}>{form.cliente}</span></div>
                <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, padding:'5px 0', borderBottom:'1px solid var(--border)' }}><span style={{ color:'var(--text2)' }}>Serviços</span><span style={{ color:'var(--text1)', fontWeight:500 }}>{selectedServices.join(', ')}</span></div>
                {form.valor && <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, padding:'5px 0', borderBottom:'1px solid var(--border)' }}><span style={{ color:'var(--text2)' }}>Valor do projeto</span><span style={{ color:'var(--green)', fontWeight:600, fontFamily:'var(--font-display)' }}>R$ {parseFloat(form.valor).toLocaleString('pt-BR')}</span></div>}
                {form.mensalidade > 0 && <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, padding:'5px 0', borderBottom:'1px solid var(--border)' }}><span style={{ color:'var(--text2)' }}>Mensalidade</span><span style={{ color:'var(--green)', fontWeight:600, fontFamily:'var(--font-display)' }}>R$ {parseFloat(form.mensalidade).toLocaleString('pt-BR')}/mês</span></div>}
                <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, padding:'5px 0' }}><span style={{ color:'var(--text2)' }}>Validade</span><span style={{ color:'var(--text1)' }}>{form.validade}</span></div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
