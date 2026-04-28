import React, { useState, useRef } from 'react'
import { supabase, clientesAPI } from '../lib/supabase.js'

const CAMPOS_LGPD = [
  { key: 'nome',      label: 'Nome',           obrigatorio: true  },
  { key: 'empresa',   label: 'Empresa',         obrigatorio: false },
  { key: 'segmento',  label: 'Segmento',        obrigatorio: false },
  { key: 'contato',   label: 'Contato',         obrigatorio: false },
  { key: 'email',     label: 'E-mail',          obrigatorio: false },
  { key: 'whatsapp',  label: 'WhatsApp',        obrigatorio: false },
  { key: 'status',    label: 'Status',          obrigatorio: false },
  { key: 'mrr',       label: 'MRR',             obrigatorio: false },
  { key: 'criado_em', label: 'Data de cadastro',obrigatorio: false },
]

const FINALIDADES = [
  'Relatório interno de clientes',
  'Auditoria de conformidade LGPD',
  'Migração para outro sistema',
  'Backup de dados',
  'Solicitação do titular dos dados',
  'Outra finalidade (descreva abaixo)',
]

const STATUS_MAP = {
  'ativo':'ativo','active':'ativo','cliente':'ativo',
  'prospect':'prospect','lead':'prospect','novo':'prospect',
  'qualificação':'qualificacao','qualificacao':'qualificacao',
  'proposta':'proposta','negociação':'proposta',
  'pausado':'pausado','inativo':'pausado',
  'perdido':'perdido','cancelado':'perdido',
}
const CORES = ['#4F7CFF','#7B5CFF','#22C97A','#F5A623','#FF5B5B']

export default function Dados() {
  const [tab, setTab] = useState('exportar')

  // ── Exportação ─────────────────────────────────────────────────
  const [camposSelecionados, setCamposSelecionados] = useState(
    CAMPOS_LGPD.filter(c => c.obrigatorio).map(c => c.key)
  )
  const [finalidade, setFinalidade]     = useState('')
  const [finalidadeCustom, setFinalidadeCustom] = useState('')
  const [consentimento, setConsentimento] = useState(false)
  const [exportando, setExportando]     = useState(false)
  const [exportLog, setExportLog]       = useState(null)

  // ── Import CSV ─────────────────────────────────────────────────
  const [arquivo, setArquivo]   = useState(null)
  const [preview, setPreview]   = useState(null)
  const [importando, setImportando] = useState(false)
  const [importLog, setImportLog]   = useState(null)
  const [errosImport, setErrosImport] = useState([])
  const fileRef = useRef()

  // ── Import PDF ─────────────────────────────────────────────────
  const [pdfFile, setPdfFile]         = useState(null)
  const [pdfLoading, setPdfLoading]   = useState(false)
  const [pdfLeads, setPdfLeads]       = useState([])
  const [pdfErro, setPdfErro]         = useState('')
  const [pdfImportando, setPdfImportando] = useState(false)
  const [pdfLog, setPdfLog]           = useState(null)
  const [pdfSelecionados, setPdfSelecionados] = useState([])
  const [pdfObs, setPdfObs]           = useState('')
  const pdfRef = useRef()

  // ── Helpers ────────────────────────────────────────────────────
  const finalidadeReal = finalidade === 'Outra finalidade (descreva abaixo)'
    ? finalidadeCustom : finalidade
  const podExportar = camposSelecionados.length > 0 && finalidadeReal.trim() && consentimento

  const toggleCampo = (key) => {
    if (CAMPOS_LGPD.find(c => c.key === key)?.obrigatorio) return
    setCamposSelecionados(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    )
  }

  const toggleSelecionado = (idx) =>
    setPdfSelecionados(prev =>
      prev.includes(idx) ? prev.filter(i => i !== idx) : [...prev, idx]
    )

  const toggleTodos = () =>
    setPdfSelecionados(prev =>
      prev.length === pdfLeads.length ? [] : pdfLeads.map((_, i) => i)
    )

  async function registrarAuditoria(tipo, qtd, campos) {
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('auditoria_exportacoes').insert({
      usuario_email: user?.email || 'agencia',
      tipo_exportacao: tipo,
      registros_afetados: qtd,
      finalidade: finalidadeReal || 'Importação via IA',
      dados_exportados: { campos },
    })
  }

  // ── EXPORTAR CSV ────────────────────────────────────────────────
  async function exportarCSV() {
    setExportando(true)
    try {
      const { data: clientes } = await clientesAPI.listar()
      if (!clientes?.length) { alert('Nenhum cliente cadastrado.'); return }
      const agora = new Date().toLocaleString('pt-BR')
      const header = [
        `# EXPORTAÇÃO DE DADOS — FlowCRM | Flow Agency`,
        `# Data/hora: ${agora}`,
        `# Finalidade: ${finalidadeReal}`,
        `# Campos exportados: ${camposSelecionados.join(', ')}`,
        `# Conformidade: LGPD — Lei 13.709/2018`,
        `# Este arquivo contém dados pessoais. Trate com confidencialidade.`,
        ``,
      ].join('\n')
      const cols = CAMPOS_LGPD.filter(c => camposSelecionados.includes(c.key))
      const csvHeader = cols.map(c => c.label).join(';')
      const csvRows = clientes.map(cl =>
        cols.map(c => {
          let val = cl[c.key] ?? ''
          if (c.key === 'criado_em') val = val ? new Date(val).toLocaleDateString('pt-BR') : ''
          if (c.key === 'mrr') val = val ? `R$ ${Number(val).toLocaleString('pt-BR')}` : ''
          return `"${String(val).replace(/"/g, '""')}"`
        }).join(';')
      ).join('\n')
      const blob = new Blob(['\ufeff' + header + csvHeader + '\n' + csvRows], { type: 'text/csv;charset=utf-8' })
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = `flowcrm_clientes_${new Date().toISOString().split('T')[0]}.csv`
      a.click()
      await registrarAuditoria('csv', clientes.length, camposSelecionados)
      setExportLog({ tipo: 'CSV', qtd: clientes.length, hora: agora })
    } finally { setExportando(false) }
  }

  // ── EXPORTAR PDF ────────────────────────────────────────────────
  async function exportarPDF() {
    setExportando(true)
    try {
      const { data: clientes } = await clientesAPI.listar()
      if (!clientes?.length) { alert('Nenhum cliente cadastrado.'); return }
      const agora = new Date().toLocaleString('pt-BR')
      const cols = CAMPOS_LGPD.filter(c => camposSelecionados.includes(c.key))
      const tdS = 'padding:7px 12px;font-size:11px;color:#333;border-bottom:1px solid #eee;'
      const rows = clientes.map((cl, i) =>
        `<tr style="${i%2?'background:#f9f9f9':''}">` +
        cols.map(c => {
          let val = cl[c.key] ?? '—'
          if (c.key==='criado_em') val = val!=='—' ? new Date(val).toLocaleDateString('pt-BR') : '—'
          if (c.key==='mrr') val = val&&val!=='—' ? `R$ ${Number(val).toLocaleString('pt-BR')}` : '—'
          return `<td style="${tdS}">${val}</td>`
        }).join('') + `</tr>`
      ).join('')
      const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"/>
<title>FlowCRM — Exportação</title>
<style>body{font-family:Arial,sans-serif;margin:30px}h1{font-size:20px;color:#4F7CFF}
.meta{font-size:11px;color:#555;padding:10px;background:#f5f5f5;border-left:3px solid #4F7CFF;margin-bottom:16px;line-height:1.8}
table{width:100%;border-collapse:collapse}th{padding:8px 12px;background:#4F7CFF;color:#fff;font-size:11px;text-align:left}
.footer{margin-top:24px;font-size:10px;color:#aaa;border-top:1px solid #eee;padding-top:8px}
@media print{.no-print{display:none}}</style></head><body>
<h1>FlowCRM — Exportação de Clientes</h1>
<div class="meta"><b>Data/hora:</b> ${agora}<br/><b>Finalidade:</b> ${finalidadeReal}<br/>
<b>Campos:</b> ${cols.map(c=>c.label).join(', ')}<br/>
<b>Total:</b> ${clientes.length} registros<br/>
<b>Conformidade:</b> LGPD — Lei 13.709/2018<br/>
<b>⚠ Aviso:</b> Dados pessoais — trate com confidencialidade.</div>
<table><thead><tr>${cols.map(c=>`<th>${c.label}</th>`).join('')}</tr></thead>
<tbody>${rows}</tbody></table>
<div class="footer">FlowCRM · Flow Agency · ${agora} · LGPD Lei 13.709/2018</div>
<script>window.onload=()=>window.print()<\/script></body></html>`
      const w = window.open('', '_blank')
      w.document.write(html)
      w.document.close()
      await registrarAuditoria('pdf', clientes.length, camposSelecionados)
      setExportLog({ tipo: 'PDF', qtd: clientes.length, hora: agora })
    } finally { setExportando(false) }
  }

  // ── IMPORTAR PDF via IA ─────────────────────────────────────────
  async function handlePDF(e) {
    const file = e.target.files[0]
    if (!file) return
    setPdfFile(file)
    setPdfLeads([])
    setPdfErro('')
    setPdfLog(null)
    setPdfSelecionados([])
    setPdfObs('')
    setPdfLoading(true)

    try {
      const base64 = await new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result.split(',')[1])
        reader.onerror = reject
        reader.readAsDataURL(file)
      })

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 4000,
          messages: [{
            role: 'user',
            content: [
              {
                type: 'document',
                source: { type: 'base64', media_type: 'application/pdf', data: base64 }
              },
              {
                type: 'text',
                text: `Analise este PDF exportado de um CRM e extraia TODOS os leads/clientes/contatos.
Para cada registro encontrado, mapeie os dados disponíveis para:
- nome: nome da pessoa ou empresa (obrigatório)
- empresa: nome da empresa
- segmento: setor de atuação
- contato: nome do responsável
- email: e-mail
- whatsapp: telefone ou WhatsApp
- status: situação (mapeie para: ativo, prospect, qualificacao, proposta, pausado, perdido)
- mrr: valor mensal em número puro (ex: 1500.00)

Responda SOMENTE com JSON válido, sem texto antes ou depois:
{"leads": [...], "total": N, "observacoes": "texto opcional sobre o PDF"}

Se não encontrar leads: {"leads": [], "total": 0, "observacoes": "motivo"}`
              }
            ]
          }]
        })
      })

      const data = await response.json()
      if (data.error) throw new Error(data.error.message || 'Erro na API')

      const text = data.content?.[0]?.text || ''
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      if (!jsonMatch) throw new Error('Resposta da IA não contém JSON válido')

      const parsed = JSON.parse(jsonMatch[0])
      const leads = parsed.leads || []
      setPdfObs(parsed.observacoes || '')

      if (leads.length === 0) {
        setPdfErro(parsed.observacoes || 'Nenhum lead identificado no PDF.')
      } else {
        const normalizados = leads.map((l, i) => ({
          nome:     l.nome || l.empresa || 'Sem nome',
          empresa:  l.empresa || null,
          segmento: l.segmento || null,
          contato:  l.contato || null,
          email:    l.email || null,
          whatsapp: l.whatsapp || null,
          status:   STATUS_MAP[(l.status||'').toLowerCase()] || 'prospect',
          mrr:      parseFloat(String(l.mrr||'0').replace(/[^\d.,]/g,'').replace(',','.')) || 0,
          iniciais: (l.nome||l.empresa||'?').split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase(),
          cor:      CORES[i % CORES.length],
        }))
        setPdfLeads(normalizados)
        setPdfSelecionados(normalizados.map((_, i) => i))
      }
    } catch (err) {
      setPdfErro('Erro ao processar o PDF: ' + err.message)
    } finally {
      setPdfLoading(false)
    }
  }

  async function importarLeadsPDF() {
    if (!pdfSelecionados.length) return
    setPdfImportando(true)
    let sucesso = 0
    const erros = []

    for (const idx of pdfSelecionados) {
      const lead = { ...pdfLeads[idx] }
      const { error } = await supabase.from('clientes').insert(lead)
      if (error) erros.push(`${lead.nome}: ${error.message}`)
      else sucesso++
    }

    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('auditoria_exportacoes').insert({
      usuario_email: user?.email || 'agencia',
      tipo_exportacao: 'importacao',
      registros_afetados: sucesso,
      finalidade: 'Importação de leads via PDF com IA',
      dados_exportados: { arquivo: pdfFile?.name, total: pdfLeads.length, sucesso, erros: erros.length },
    })

    setPdfLog({ sucesso, erros, total: pdfSelecionados.length })
    setPdfImportando(false)
  }

  // ── IMPORTAR CSV ────────────────────────────────────────────────
  function handleArquivo(e) {
    const file = e.target.files[0]
    if (!file) return
    setArquivo(file)
    setImportLog(null)
    setErrosImport([])
    const reader = new FileReader()
    reader.onload = (ev) => {
      const texto = ev.target.result
      const linhas = texto.split('\n').filter(l => !l.startsWith('#') && l.trim())
      if (!linhas.length) return
      const sep = linhas[0].includes(';') ? ';' : ','
      const cabecalho = linhas[0].split(sep).map(c => c.trim().replace(/"/g,'').toLowerCase())
      const dados = linhas.slice(1, 6).map(linha => {
        const vals = linha.split(sep).map(v => v.trim().replace(/^"|"$/g,''))
        const obj = {}
        cabecalho.forEach((col, i) => { obj[col] = vals[i] || '' })
        return obj
      })
      setPreview({ cabecalho, dados, sep, total: linhas.length - 1 })
    }
    reader.readAsText(file, 'utf-8')
  }

  async function executarImportacao() {
    if (!arquivo || !preview) return
    setImportando(true)
    setErrosImport([])
    const reader = new FileReader()
    reader.onload = async (ev) => {
      const texto = ev.target.result
      const linhas = texto.split('\n').filter(l => !l.startsWith('#') && l.trim())
      const sep = preview.sep
      const cabecalho = linhas[0].split(sep).map(c => c.trim().replace(/"/g,'').toLowerCase())
      const mapa = {
        'nome':'nome','name':'nome','cliente':'nome',
        'empresa':'empresa','company':'empresa',
        'segmento':'segmento','segment':'segmento','setor':'segmento',
        'contato':'contato','responsavel':'contato','contact':'contato',
        'email':'email','e-mail':'email',
        'whatsapp':'whatsapp','telefone':'whatsapp','phone':'whatsapp',
        'status':'status',
        'mrr':'mrr','valor':'mrr','mensalidade':'mrr',
      }
      const erros = []
      let sucesso = 0
      for (let i = 1; i < linhas.length; i++) {
        const vals = linhas[i].split(sep).map(v => v.trim().replace(/^"|"$/g,''))
        const raw = {}
        cabecalho.forEach((col, j) => { raw[col] = vals[j] || '' })
        const cliente = {}
        Object.entries(raw).forEach(([col, val]) => {
          const mapped = mapa[col]
          if (mapped) cliente[mapped] = val
        })
        if (!cliente.nome?.trim()) { erros.push(`Linha ${i+1}: campo "nome" ausente`); continue }
        if (cliente.mrr) {
          const num = parseFloat(String(cliente.mrr).replace(/[R$\s.]/g,'').replace(',','.'))
          cliente.mrr = isNaN(num) ? 0 : num
        }
        cliente.status = STATUS_MAP[(cliente.status||'').toLowerCase()] || 'prospect'
        cliente.iniciais = (cliente.nome||'').split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase()
        cliente.cor = CORES[sucesso % CORES.length]
        const { error } = await supabase.from('clientes').insert(cliente)
        if (error) erros.push(`Linha ${i+1}: ${error.message}`)
        else sucesso++
      }
      const { data: { user } } = await supabase.auth.getUser()
      await supabase.from('auditoria_exportacoes').insert({
        usuario_email: user?.email || 'agencia',
        tipo_exportacao: 'importacao',
        registros_afetados: sucesso,
        finalidade: 'Importação de leads via CSV',
        dados_exportados: { arquivo: arquivo.name, total: linhas.length-1, sucesso, erros: erros.length },
      })
      setImportLog({ sucesso, erros: erros.length, total: linhas.length-1 })
      setErrosImport(erros)
      setImportando(false)
    }
    reader.readAsText(arquivo, 'utf-8')
  }

  // ── Estilos ─────────────────────────────────────────────────────
  const inp = {
    width:'100%', background:'var(--bg3)', border:'1px solid var(--border2)',
    borderRadius:7, padding:'8px 12px', color:'var(--text1)',
    fontSize:12, outline:'none', fontFamily:'DM Sans, sans-serif',
  }
  const card = {
    background:'var(--bg2)', border:'1px solid var(--border)',
    borderRadius:10, padding:18, marginBottom:14,
  }
  const alertBox = (cor, bg) => ({
    background: bg, border:`1px solid ${cor}33`,
    borderRadius:9, padding:'12px 16px', marginBottom:16, display:'flex', gap:12,
  })

  return (
    <div style={{ maxWidth:720, margin:'0 auto' }}>
      <div style={{ marginBottom:20 }}>
        <h1 style={{ fontFamily:'Syne, sans-serif', fontSize:20, fontWeight:700 }}>Dados & LGPD</h1>
        <div style={{ fontSize:12, color:'var(--text3)', marginTop:2 }}>
          Importação (CSV e PDF via IA), exportação e conformidade com a Lei 13.709/2018
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display:'flex', gap:4, background:'var(--bg2)', borderRadius:8, padding:3, marginBottom:18, width:'fit-content' }}>
        {[
          { id:'exportar',  label:'Exportar Dados' },
          { id:'importar',  label:'Importar CSV'   },
          { id:'importarpdf', label:'Importar PDF via IA' },
          { id:'auditoria', label:'Auditoria LGPD' },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            padding:'6px 14px', borderRadius:6, fontSize:11, fontWeight:500,
            cursor:'pointer', border:'none', fontFamily:'DM Sans, sans-serif',
            background: tab===t.id ? 'var(--bg4)' : 'none',
            color: tab===t.id ? 'var(--text1)' : 'var(--text3)',
          }}>{t.label}</button>
        ))}
      </div>

      {/* ═══ EXPORTAR ══════════════════════════════════════════════ */}
      {tab === 'exportar' && (
        <div>
          <div style={alertBox('var(--amber)','rgba(245,166,35,0.07)')}>
            <span style={{ fontSize:16 }}>⚖️</span>
            <div>
              <div style={{ fontSize:12, fontWeight:500, color:'var(--amber)', marginBottom:3 }}>Conformidade LGPD — Lei 13.709/2018</div>
              <div style={{ fontSize:11, color:'var(--text2)', lineHeight:1.6 }}>
                A exportação deve ter <b style={{ color:'var(--text1)' }}>finalidade legítima</b>.
                Apenas os campos necessários devem ser exportados.
                Todo acesso é registrado no log de auditoria.
              </div>
            </div>
          </div>

          <div style={card}>
            <div style={{ fontSize:11, color:'var(--text3)', fontWeight:500, letterSpacing:'0.3px', marginBottom:10 }}>
              CAMPOS A EXPORTAR <span style={{ color:'var(--accent)', fontSize:10 }}>(selecione apenas o necessário)</span>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8 }}>
              {CAMPOS_LGPD.map(campo => (
                <div key={campo.key} onClick={() => toggleCampo(campo.key)} style={{
                  display:'flex', alignItems:'center', gap:8, padding:'8px 10px',
                  background: camposSelecionados.includes(campo.key) ? 'rgba(79,124,255,0.1)' : 'var(--bg3)',
                  border:`1px solid ${camposSelecionados.includes(campo.key)?'var(--accent)':'var(--border2)'}`,
                  borderRadius:7, cursor: campo.obrigatorio ? 'default' : 'pointer',
                }}>
                  <div style={{
                    width:14, height:14, borderRadius:3, flexShrink:0,
                    background: camposSelecionados.includes(campo.key) ? 'var(--accent)' : 'var(--bg4)',
                    border:`1px solid ${camposSelecionados.includes(campo.key)?'var(--accent)':'var(--border2)'}`,
                    display:'flex', alignItems:'center', justifyContent:'center',
                  }}>
                    {camposSelecionados.includes(campo.key) && <span style={{ color:'#fff', fontSize:8 }}>✓</span>}
                  </div>
                  <span style={{ fontSize:11, color: camposSelecionados.includes(campo.key) ? 'var(--accent)' : 'var(--text2)' }}>
                    {campo.label}{campo.obrigatorio && <span style={{ color:'var(--text3)', fontSize:9 }}> (obrig.)</span>}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div style={card}>
            <div style={{ fontSize:11, color:'var(--text3)', fontWeight:500, letterSpacing:'0.3px', marginBottom:8 }}>FINALIDADE DA EXPORTAÇÃO *</div>
            <select style={{ ...inp, marginBottom:8 }} value={finalidade} onChange={e => setFinalidade(e.target.value)}>
              <option value="">Selecione a finalidade...</option>
              {FINALIDADES.map(f => <option key={f}>{f}</option>)}
            </select>
            {finalidade === 'Outra finalidade (descreva abaixo)' && (
              <input style={inp} value={finalidadeCustom} onChange={e => setFinalidadeCustom(e.target.value)} placeholder="Descreva a finalidade..." />
            )}
          </div>

          <div style={{ ...card, background:'rgba(79,124,255,0.05)', border:'1px solid rgba(79,124,255,0.2)' }}>
            <div onClick={() => setConsentimento(!consentimento)} style={{ display:'flex', alignItems:'flex-start', gap:12, cursor:'pointer' }}>
              <div style={{
                width:18, height:18, borderRadius:4, flexShrink:0, marginTop:1,
                background: consentimento ? 'var(--accent)' : 'var(--bg3)',
                border:`1px solid ${consentimento ? 'var(--accent)' : 'var(--border2)'}`,
                display:'flex', alignItems:'center', justifyContent:'center',
              }}>
                {consentimento && <span style={{ color:'#fff', fontSize:11 }}>✓</span>}
              </div>
              <div style={{ fontSize:12, color:'var(--text2)', lineHeight:1.6 }}>
                Declaro que esta exportação tem <b style={{ color:'var(--text1)' }}>finalidade legítima</b>,
                que os dados serão tratados com <b style={{ color:'var(--text1)' }}>confidencialidade</b> e que
                estou ciente das obrigações da <b style={{ color:'var(--accent)' }}>LGPD — Lei 13.709/2018</b>.
              </div>
            </div>
          </div>

          <div style={{ display:'flex', gap:10 }}>
            <button onClick={exportarCSV} disabled={!podExportar || exportando} style={{
              flex:1, background: podExportar ? 'var(--green)' : 'var(--bg3)', border:'none',
              borderRadius:8, padding:11, fontSize:13, fontWeight:500,
              color: podExportar ? '#fff' : 'var(--text3)', cursor: podExportar ? 'pointer' : 'not-allowed',
            }}>↓ Exportar CSV</button>
            <button onClick={exportarPDF} disabled={!podExportar || exportando} style={{
              flex:1, background: podExportar ? 'var(--accent)' : 'var(--bg3)', border:'none',
              borderRadius:8, padding:11, fontSize:13, fontWeight:500,
              color: podExportar ? '#fff' : 'var(--text3)', cursor: podExportar ? 'pointer' : 'not-allowed',
            }}>↓ Exportar PDF</button>
          </div>

          {exportLog && (
            <div style={{ marginTop:12, background:'rgba(34,201,122,0.08)', border:'1px solid rgba(34,201,122,0.2)', borderRadius:8, padding:'11px 16px', fontSize:12, color:'var(--green)' }}>
              ✓ {exportLog.tipo} exportado — {exportLog.qtd} registros · {exportLog.hora} · Registrado no log de auditoria
            </div>
          )}
        </div>
      )}

      {/* ═══ IMPORTAR CSV ══════════════════════════════════════════ */}
      {tab === 'importar' && (
        <div>
          <div style={alertBox('var(--accent)','rgba(79,124,255,0.07)')}>
            <span style={{ fontSize:16 }}>📥</span>
            <div>
              <div style={{ fontSize:12, fontWeight:500, color:'var(--accent)', marginBottom:3 }}>Importação via CSV</div>
              <div style={{ fontSize:11, color:'var(--text2)', lineHeight:1.6 }}>
                Compatível com exportações do Xtrack, Pipedrive, HubSpot e Excel (salvo como CSV).
                O sistema detecta automaticamente as colunas.
              </div>
            </div>
          </div>

          <div style={card}>
            <div style={{ fontSize:11, color:'var(--text3)', fontWeight:500, marginBottom:10 }}>SELECIONAR ARQUIVO CSV</div>
            <div onClick={() => fileRef.current?.click()}
              onDragOver={e => e.preventDefault()}
              onDrop={e => { e.preventDefault(); handleArquivo({ target:{ files:[e.dataTransfer.files[0]] } }) }}
              style={{
                border:`2px dashed ${arquivo ? 'var(--accent)' : 'var(--border2)'}`,
                borderRadius:8, padding:24, textAlign:'center', cursor:'pointer',
                background: arquivo ? 'rgba(79,124,255,0.05)' : 'var(--bg3)',
              }}>
              <div style={{ fontSize:24, marginBottom:8 }}>📄</div>
              <div style={{ fontSize:12, color: arquivo ? 'var(--accent)' : 'var(--text3)' }}>
                {arquivo ? arquivo.name : 'Arraste o CSV aqui ou clique para selecionar'}
              </div>
            </div>
            <input ref={fileRef} type="file" accept=".csv" onChange={handleArquivo} style={{ display:'none' }} />
          </div>

          {preview?.dados?.length > 0 && (
            <div style={card}>
              <div style={{ fontSize:11, color:'var(--text3)', fontWeight:500, marginBottom:10 }}>
                PRÉVIA — {preview.total} registros (mostrando 5 primeiros)
              </div>
              <div style={{ overflowX:'auto' }}>
                <table style={{ width:'100%', borderCollapse:'collapse' }}>
                  <thead>
                    <tr>{preview.cabecalho.map(col => (
                      <th key={col} style={{ fontSize:10, color:'var(--text3)', textAlign:'left', padding:'6px 8px', borderBottom:'1px solid var(--border)', fontWeight:500 }}>{col}</th>
                    ))}</tr>
                  </thead>
                  <tbody>
                    {preview.dados.map((row, i) => (
                      <tr key={i}>{preview.cabecalho.map(col => (
                        <td key={col} style={{ fontSize:11, color:'var(--text2)', padding:'6px 8px', borderBottom:'1px solid var(--border)', whiteSpace:'nowrap' }}>
                          {row[col] || '—'}
                        </td>
                      ))}</tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <button onClick={executarImportacao} disabled={importando} style={{
                marginTop:14, width:'100%', background:'var(--accent)', border:'none',
                borderRadius:8, padding:10, fontSize:13, fontWeight:500,
                color:'#fff', cursor:'pointer', opacity:importando ? 0.6 : 1,
              }}>
                {importando ? 'Importando...' : `↑ Importar ${preview.total} leads`}
              </button>
            </div>
          )}

          {importLog && (
            <div style={{ background:'rgba(34,201,122,0.08)', border:'1px solid rgba(34,201,122,0.2)', borderRadius:8, padding:'12px 16px', fontSize:12 }}>
              <div style={{ color:'var(--green)', fontWeight:500 }}>✓ {importLog.sucesso} de {importLog.total} leads importados com sucesso</div>
              {importLog.erros > 0 && <div style={{ color:'var(--amber)', marginTop:4 }}>⚠ {importLog.erros} com erro</div>}
            </div>
          )}
          {errosImport.length > 0 && (
            <div style={{ ...card, marginTop:8 }}>
              <div style={{ fontSize:11, color:'var(--red)', fontWeight:500, marginBottom:8 }}>ERROS</div>
              {errosImport.map((e, i) => <div key={i} style={{ fontSize:11, color:'var(--text2)', padding:'3px 0', borderBottom:'1px solid var(--border)' }}>⚠ {e}</div>)}
            </div>
          )}
        </div>
      )}

      {/* ═══ IMPORTAR PDF via IA ════════════════════════════════════ */}
      {tab === 'importarpdf' && (
        <div>
          <div style={alertBox('var(--accent2)','rgba(123,92,255,0.07)')}>
            <span style={{ fontSize:16 }}>🤖</span>
            <div>
              <div style={{ fontSize:12, fontWeight:500, color:'var(--accent2)', marginBottom:3 }}>Importação via PDF com Inteligência Artificial</div>
              <div style={{ fontSize:11, color:'var(--text2)', lineHeight:1.6 }}>
                Faça upload do PDF exportado pelo <b style={{ color:'var(--text1)' }}>Xtrack</b> (ou qualquer CRM).
                A IA analisa o documento, identifica todos os leads automaticamente e
                prepara os dados para você revisar antes de importar.
              </div>
            </div>
          </div>

          {/* Upload PDF */}
          {!pdfLeads.length && !pdfLoading && (
            <div style={card}>
              <div style={{ fontSize:11, color:'var(--text3)', fontWeight:500, marginBottom:10 }}>SELECIONAR PDF DO XTRACK</div>
              <div onClick={() => pdfRef.current?.click()}
                onDragOver={e => e.preventDefault()}
                onDrop={e => { e.preventDefault(); handlePDF({ target:{ files:[e.dataTransfer.files[0]] } }) }}
                style={{
                  border:`2px dashed ${pdfFile ? 'var(--accent2)' : 'var(--border2)'}`,
                  borderRadius:8, padding:32, textAlign:'center', cursor:'pointer',
                  background: pdfFile ? 'rgba(123,92,255,0.05)' : 'var(--bg3)',
                  transition:'all 0.2s',
                }}>
                <div style={{ fontSize:32, marginBottom:10 }}>📄</div>
                <div style={{ fontSize:13, color:'var(--text2)', marginBottom:4 }}>
                  {pdfFile ? pdfFile.name : 'Arraste o PDF aqui ou clique para selecionar'}
                </div>
                <div style={{ fontSize:11, color:'var(--text3)' }}>Formato aceito: .pdf (exportação do Xtrack ou outro CRM)</div>
              </div>
              <input ref={pdfRef} type="file" accept=".pdf" onChange={handlePDF} style={{ display:'none' }} />
            </div>
          )}

          {/* Loading */}
          {pdfLoading && (
            <div style={{ ...card, textAlign:'center', padding:40 }}>
              <div style={{ display:'flex', justifyContent:'center', gap:6, marginBottom:16 }}>
                {[0,150,300].map(d => (
                  <div key={d} style={{ width:8, height:8, borderRadius:'50%', background:'var(--accent2)', animation:'pulse 1.2s ease-in-out infinite', animationDelay:`${d}ms` }}></div>
                ))}
              </div>
              <style>{`@keyframes pulse{0%,80%,100%{opacity:.3}40%{opacity:1}}`}</style>
              <div style={{ fontSize:13, color:'var(--text2)', fontWeight:500 }}>IA analisando o PDF...</div>
              <div style={{ fontSize:11, color:'var(--text3)', marginTop:6 }}>Identificando leads, campos e valores automaticamente</div>
            </div>
          )}

          {/* Erro */}
          {pdfErro && !pdfLoading && (
            <div style={{ background:'rgba(255,91,91,0.08)', border:'1px solid rgba(255,91,91,0.2)', borderRadius:9, padding:'14px 16px', marginBottom:14 }}>
              <div style={{ fontSize:12, color:'var(--red)', fontWeight:500, marginBottom:4 }}>⚠ Não foi possível extrair leads</div>
              <div style={{ fontSize:11, color:'var(--text2)' }}>{pdfErro}</div>
              <button onClick={() => { setPdfFile(null); setPdfErro(''); pdfRef.current.value='' }}
                style={{ marginTop:10, background:'none', border:'1px solid var(--border2)', borderRadius:6, padding:'5px 12px', fontSize:11, color:'var(--text2)', cursor:'pointer' }}>
                Tentar outro arquivo
              </button>
            </div>
          )}

          {/* Leads extraídos */}
          {pdfLeads.length > 0 && !pdfLoading && !pdfLog && (
            <div>
              <div style={{ ...card, background:'rgba(34,201,122,0.06)', border:'1px solid rgba(34,201,122,0.2)' }}>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:4 }}>
                  <div style={{ fontSize:13, fontWeight:500, color:'var(--green)' }}>
                    ✓ IA identificou {pdfLeads.length} leads no PDF
                  </div>
                  <div style={{ fontSize:11, color:'var(--text3)' }}>{pdfFile?.name}</div>
                </div>
                {pdfObs && <div style={{ fontSize:11, color:'var(--text2)' }}>{pdfObs}</div>}
              </div>

              <div style={card}>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
                  <div style={{ fontSize:11, color:'var(--text3)', fontWeight:500, letterSpacing:'0.3px' }}>
                    REVISAR LEADS ANTES DE IMPORTAR
                  </div>
                  <button onClick={toggleTodos} style={{
                    background:'none', border:'1px solid var(--border2)', borderRadius:6,
                    padding:'4px 10px', fontSize:11, color:'var(--text2)', cursor:'pointer',
                  }}>
                    {pdfSelecionados.length === pdfLeads.length ? 'Desmarcar todos' : 'Selecionar todos'}
                  </button>
                </div>

                <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                  {pdfLeads.map((lead, idx) => (
                    <div key={idx} onClick={() => toggleSelecionado(idx)} style={{
                      display:'flex', alignItems:'center', gap:12, padding:'10px 12px',
                      background: pdfSelecionados.includes(idx) ? 'rgba(79,124,255,0.06)' : 'var(--bg3)',
                      border:`1px solid ${pdfSelecionados.includes(idx) ? 'var(--accent)' : 'var(--border2)'}`,
                      borderRadius:8, cursor:'pointer', transition:'all 0.15s',
                    }}>
                      {/* Checkbox */}
                      <div style={{
                        width:16, height:16, borderRadius:4, flexShrink:0,
                        background: pdfSelecionados.includes(idx) ? 'var(--accent)' : 'var(--bg4)',
                        border:`1px solid ${pdfSelecionados.includes(idx) ? 'var(--accent)' : 'var(--border2)'}`,
                        display:'flex', alignItems:'center', justifyContent:'center',
                      }}>
                        {pdfSelecionados.includes(idx) && <span style={{ color:'#fff', fontSize:10 }}>✓</span>}
                      </div>

                      {/* Avatar */}
                      <div style={{ width:30, height:30, borderRadius:7, background:lead.cor, display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:600, color:'#fff', flexShrink:0 }}>
                        {lead.iniciais}
                      </div>

                      {/* Dados */}
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontSize:12, fontWeight:500, color:'var(--text1)', marginBottom:2 }}>{lead.nome}</div>
                        <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                          {lead.empresa && <span style={{ fontSize:10, color:'var(--text3)' }}>{lead.empresa}</span>}
                          {lead.segmento && <span style={{ fontSize:10, color:'var(--text3)' }}>· {lead.segmento}</span>}
                          {lead.email && <span style={{ fontSize:10, color:'var(--text3)' }}>· {lead.email}</span>}
                          {lead.whatsapp && <span style={{ fontSize:10, color:'var(--text3)' }}>· {lead.whatsapp}</span>}
                        </div>
                      </div>

                      {/* Status + MRR */}
                      <div style={{ display:'flex', gap:8, alignItems:'center', flexShrink:0 }}>
                        {lead.mrr > 0 && (
                          <span style={{ fontSize:11, fontWeight:600, color:'var(--green)', fontFamily:'Syne, sans-serif' }}>
                            R$ {Number(lead.mrr).toLocaleString('pt-BR')}
                          </span>
                        )}
                        <span style={{ fontSize:10, padding:'2px 7px', borderRadius:4, fontWeight:500, background:'rgba(79,124,255,0.15)', color:'var(--accent)' }}>
                          {lead.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                <div style={{ marginTop:14, display:'flex', gap:10, alignItems:'center' }}>
                  <div style={{ fontSize:11, color:'var(--text3)', flex:1 }}>
                    {pdfSelecionados.length} de {pdfLeads.length} leads selecionados para importar
                  </div>
                  <button onClick={() => { setPdfFile(null); setPdfLeads([]); setPdfErro(''); pdfRef.current.value='' }}
                    style={{ background:'none', border:'1px solid var(--border2)', borderRadius:7, padding:'7px 14px', fontSize:12, color:'var(--text2)', cursor:'pointer' }}>
                    Cancelar
                  </button>
                  <button onClick={importarLeadsPDF} disabled={!pdfSelecionados.length || pdfImportando} style={{
                    background: pdfSelecionados.length ? 'var(--accent2)' : 'var(--bg3)',
                    border:'none', borderRadius:7, padding:'8px 20px',
                    fontSize:12, fontWeight:500, color: pdfSelecionados.length ? '#fff' : 'var(--text3)',
                    cursor: pdfSelecionados.length ? 'pointer' : 'not-allowed',
                  }}>
                    {pdfImportando ? 'Importando...' : `↑ Importar ${pdfSelecionados.length} leads`}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Resultado importação */}
          {pdfLog && (
            <div style={{ background:'rgba(34,201,122,0.08)', border:'1px solid rgba(34,201,122,0.2)', borderRadius:8, padding:'16px', fontSize:12 }}>
              <div style={{ color:'var(--green)', fontWeight:500, fontSize:13, marginBottom:6 }}>
                ✓ Importação concluída com sucesso!
              </div>
              <div style={{ color:'var(--text2)' }}>
                <b style={{ color:'var(--text1)' }}>{pdfLog.sucesso}</b> de <b style={{ color:'var(--text1)' }}>{pdfLog.total}</b> leads importados para o FlowCRM
              </div>
              {pdfLog.erros?.length > 0 && (
                <div style={{ marginTop:8 }}>
                  <div style={{ color:'var(--amber)', marginBottom:4 }}>⚠ {pdfLog.erros.length} com erro:</div>
                  {pdfLog.erros.map((e, i) => <div key={i} style={{ fontSize:11, color:'var(--text3)' }}>• {e}</div>)}
                </div>
              )}
              <button onClick={() => { setPdfFile(null); setPdfLeads([]); setPdfLog(null); setPdfErro(''); pdfRef.current.value='' }}
                style={{ marginTop:12, background:'var(--accent)', border:'none', borderRadius:7, padding:'7px 16px', fontSize:12, color:'#fff', cursor:'pointer' }}>
                Importar outro PDF
              </button>
            </div>
          )}
        </div>
      )}

      {/* ═══ AUDITORIA ════════════════════════════════════════════ */}
      {tab === 'auditoria' && <AuditoriaTab />}
    </div>
  )
}

function AuditoriaTab() {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  React.useEffect(() => {
    supabase.from('auditoria_exportacoes').select('*').order('criado_em', { ascending:false }).limit(50)
      .then(({ data }) => { setLogs(data||[]); setLoading(false) })
  }, [])
  const tipoLabel = { csv:'CSV', pdf:'PDF', importacao:'Importação' }
  const tipoCor   = { csv:'var(--green)', pdf:'var(--accent)', importacao:'var(--amber)' }
  return (
    <div>
      <div style={{ background:'rgba(79,124,255,0.07)', border:'1px solid rgba(79,124,255,0.2)', borderRadius:9, padding:'12px 16px', marginBottom:16, display:'flex', gap:12 }}>
        <span style={{ fontSize:16 }}>📋</span>
        <div>
          <div style={{ fontSize:12, fontWeight:500, color:'var(--accent)', marginBottom:3 }}>Log de Auditoria</div>
          <div style={{ fontSize:11, color:'var(--text2)', lineHeight:1.6 }}>
            Registro de todas as exportações e importações — <b style={{ color:'var(--text1)' }}>Art. 37 da LGPD</b>.
          </div>
        </div>
      </div>
      <div style={{ background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:10, overflow:'hidden' }}>
        <table style={{ width:'100%', borderCollapse:'collapse' }}>
          <thead>
            <tr>{['Data/Hora','Tipo','Usuário','Registros','Finalidade'].map(h => (
              <th key={h} style={{ fontSize:10, color:'var(--text3)', textAlign:'left', padding:'8px 12px', borderBottom:'1px solid var(--border)', fontWeight:500, letterSpacing:'0.3px' }}>{h}</th>
            ))}</tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={5} style={{ padding:20, color:'var(--text3)', fontSize:12 }}>Carregando...</td></tr>}
            {!loading && logs.length === 0 && <tr><td colSpan={5} style={{ padding:20, color:'var(--text3)', fontSize:12 }}>Nenhuma operação registrada ainda.</td></tr>}
            {logs.map(log => (
              <tr key={log.id} style={{ borderBottom:'1px solid var(--border)' }}>
                <td style={{ padding:'9px 12px', fontSize:11, color:'var(--text3)' }}>{new Date(log.criado_em).toLocaleString('pt-BR')}</td>
                <td style={{ padding:'9px 12px' }}>
                  <span style={{ fontSize:10, padding:'2px 7px', borderRadius:4, fontWeight:500, background:`${tipoCor[log.tipo_exportacao]}22`, color:tipoCor[log.tipo_exportacao] }}>
                    {tipoLabel[log.tipo_exportacao]}
                  </span>
                </td>
                <td style={{ padding:'9px 12px', fontSize:11, color:'var(--text2)' }}>{log.usuario_email}</td>
                <td style={{ padding:'9px 12px', fontSize:11, color:'var(--text1)', fontWeight:500 }}>{log.registros_afetados}</td>
                <td style={{ padding:'9px 12px', fontSize:11, color:'var(--text2)', maxWidth:200, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{log.finalidade}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
