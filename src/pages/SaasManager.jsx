import React, { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { toast } from '../lib/toast.js'

const STATUS_COR = {
  inativo: 'var(--text3)',
  trial: 'var(--sky)',
  ativo: 'var(--green)',
  bloqueado: 'var(--red)',
}
const STATUS_LABEL = {
  inativo: 'Inativo',
  trial: '🕐 Trial',
  ativo: '✓ Ativo',
  bloqueado: '🔒 Bloqueado',
}

const PIX_CHAVE = 'bgalvao1@gmail.com' // Sua chave PIX padrão

export default function SaasManager() {
  const [clientes, setClientes] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalCliente, setModalCliente] = useState(null)
  const [modalPagamento, setModalPagamento] = useState(null)
  const [pagamentos, setPagamentos] = useState([])
  const [form, setForm] = useState({})
  const [saving, setSaving] = useState(false)
  const [busca, setBusca] = useState('')

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const { data } = await supabase.from('clientes')
      .select('id, nome, email, cor, iniciais, status, saas_ativo, saas_status, saas_trial_inicio, saas_trial_fim, saas_mensalidade, saas_proximo_vencimento, saas_ultimo_pagamento, saas_senha')
      .order('nome')
    setClientes(data || [])
    setLoading(false)
  }

  async function abrirCliente(c) {
    setModalCliente(c)
    setForm({
      saas_status: c.saas_status || 'inativo',
      saas_mensalidade: c.saas_mensalidade || 97,
      saas_senha: c.saas_senha || '',
    })
    const { data: p } = await supabase.from('saas_pagamentos').select('*').eq('cliente_id', c.id).order('data_pagamento', { ascending: false })
    setPagamentos(p || [])
  }

  async function ativarTrial(clienteId) {
    const inicio = new Date()
    const fim = new Date()
    fim.setDate(fim.getDate() + 7)
    await supabase.from('clientes').update({
      saas_ativo: true,
      saas_status: 'trial',
      saas_trial_inicio: inicio.toISOString(),
      saas_trial_fim: fim.toISOString(),
      saas_proximo_vencimento: fim.toISOString().split('T')[0],
      saas_pix_chave: PIX_CHAVE,
    }).eq('id', clienteId)
    toast.success('Trial de 7 dias ativado!')
    await load()
    setModalCliente(null)
  }

  async function salvarConfig() {
    setSaving(true)
    const { error } = await supabase.from('clientes').update({
      saas_status: form.saas_status,
      saas_ativo: ['trial','ativo'].includes(form.saas_status),
      saas_mensalidade: parseFloat(form.saas_mensalidade) || 97,
      saas_senha: form.saas_senha,
      saas_pix_chave: PIX_CHAVE,
    }).eq('id', modalCliente.id)
    setSaving(false)
    if (error) { toast.error('Erro ao salvar'); return }
    toast.success('Configuração salva')
    await load()
    setModalCliente(null)
  }

  async function confirmarPagamento() {
    const hoje = new Date()
    const proximo = new Date()
    proximo.setMonth(proximo.getMonth() + 1)

    await supabase.from('saas_pagamentos').insert({
      cliente_id: modalPagamento.id,
      valor: modalPagamento.saas_mensalidade || 97,
      data_pagamento: hoje.toISOString().split('T')[0],
      mes_referencia: hoje.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }),
    })
    await supabase.from('clientes').update({
      saas_status: 'ativo',
      saas_ativo: true,
      saas_ultimo_pagamento: hoje.toISOString().split('T')[0],
      saas_proximo_vencimento: proximo.toISOString().split('T')[0],
    }).eq('id', modalPagamento.id)

    toast.success('Pagamento confirmado — acesso liberado!')
    setModalPagamento(null)
    await load()
  }

  async function bloquear(clienteId) {
    await supabase.from('clientes').update({ saas_status: 'bloqueado', saas_ativo: false }).eq('id', clienteId)
    toast.success('Acesso bloqueado')
    await load()
    setModalCliente(null)
  }

  // Verifica trials vencidos automaticamente
  useEffect(() => {
    clientes.forEach(async c => {
      if (c.saas_status === 'trial' && c.saas_trial_fim) {
        if (new Date(c.saas_trial_fim) < new Date()) {
          await supabase.from('clientes').update({ saas_status: 'bloqueado', saas_ativo: false }).eq('id', c.id)
        }
      }
    })
  }, [clientes])

  const filtrados = clientes.filter(c => c.nome?.toLowerCase().includes(busca.toLowerCase()))
  const stats = {
    trial: clientes.filter(c => c.saas_status === 'trial').length,
    ativo: clientes.filter(c => c.saas_status === 'ativo').length,
    bloqueado: clientes.filter(c => c.saas_status === 'bloqueado').length,
    mrr: clientes.filter(c => c.saas_status === 'ativo').reduce((a, c) => a + Number(c.saas_mensalidade || 0), 0),
  }

  return (
    <div>
      <div className="fade-up" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 className="page-title">Gestão SaaS</h1>
          <div className="page-sub">Controle de assinaturas do mini-CRM por cliente</div>
        </div>
        <div style={{ fontSize: 11, color: 'var(--text3)', background: 'var(--bg3)', borderRadius: 8, padding: '8px 14px' }}>
          PIX: <strong style={{ color: 'var(--accent)' }}>{PIX_CHAVE}</strong>
        </div>
      </div>

      {/* Métricas */}
      <div className="stagger" style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginBottom: 20 }}>
        {[
          { label: 'Em trial', value: stats.trial, cor: 'var(--sky)' },
          { label: 'Ativos', value: stats.ativo, cor: 'var(--green)' },
          { label: 'Bloqueados', value: stats.bloqueado, cor: 'var(--red)' },
          { label: 'MRR SaaS', value: `R$ ${stats.mrr.toLocaleString('pt-BR')}`, cor: 'var(--accent)' },
        ].map((m, i) => (
          <div key={i} className="card" style={{ borderTop: `2px solid ${m.cor}` }}>
            <div className="eyebrow" style={{ marginBottom: 4 }}>{m.label}</div>
            <div className="num" style={{ fontSize: 22, fontWeight: 700 }}>{m.value}</div>
          </div>
        ))}
      </div>

      {/* Busca */}
      <div style={{ marginBottom: 14 }}>
        <input className="input" style={{ maxWidth: 320 }} placeholder="Buscar cliente..." value={busca} onChange={e => setBusca(e.target.value)} />
      </div>

      {/* Tabela */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr>
            {['Cliente','E-mail','Status SaaS','Mensalidade','Próx. Vencimento','Último Pag.','Ações'].map(h => (
              <th key={h} style={{ fontSize: 10, color: 'var(--text3)', padding: '10px 14px', borderBottom: '1px solid var(--border)', textAlign: 'left', fontWeight: 500 }}>{h}</th>
            ))}
          </tr></thead>
          <tbody>
            {loading && <tr><td colSpan={7} style={{ padding: 20 }}><div className="skeleton" style={{ height: 20 }} /></td></tr>}
            {filtrados.map(c => {
              const vencido = c.saas_proximo_vencimento && new Date(c.saas_proximo_vencimento) < new Date() && c.saas_status === 'trial'
              return (
                <tr key={c.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '10px 14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 26, height: 26, borderRadius: 6, background: c.cor || 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, color: '#fff', flexShrink: 0 }}>{c.iniciais}</div>
                      <span style={{ fontSize: 12, fontWeight: 500 }}>{c.nome}</span>
                    </div>
                  </td>
                  <td style={{ padding: '10px 14px', fontSize: 11, color: 'var(--text3)' }}>{c.email || '—'}</td>
                  <td style={{ padding: '10px 14px' }}>
                    <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 6, background: `${STATUS_COR[c.saas_status || 'inativo']}18`, color: STATUS_COR[c.saas_status || 'inativo'] }}>
                      {STATUS_LABEL[c.saas_status || 'inativo']}
                    </span>
                    {vencido && <span className="badge badge-red" style={{ marginLeft: 6, fontSize: 9 }}>Vencido</span>}
                  </td>
                  <td style={{ padding: '10px 14px', fontSize: 12, color: 'var(--accent)', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                    {c.saas_mensalidade ? `R$ ${Number(c.saas_mensalidade).toLocaleString('pt-BR')}` : '—'}
                  </td>
                  <td style={{ padding: '10px 14px', fontSize: 11, color: c.saas_proximo_vencimento && new Date(c.saas_proximo_vencimento) < new Date() ? 'var(--red)' : 'var(--text2)' }}>
                    {c.saas_proximo_vencimento ? new Date(c.saas_proximo_vencimento + 'T12:00:00').toLocaleDateString('pt-BR') : '—'}
                  </td>
                  <td style={{ padding: '10px 14px', fontSize: 11, color: 'var(--text3)' }}>
                    {c.saas_ultimo_pagamento ? new Date(c.saas_ultimo_pagamento + 'T12:00:00').toLocaleDateString('pt-BR') : '—'}
                  </td>
                  <td style={{ padding: '10px 14px' }}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="btn btn-ghost" style={{ fontSize: 10, padding: '4px 8px' }} onClick={() => abrirCliente(c)}>Configurar</button>
                      {(c.saas_status === 'bloqueado' || !c.saas_status || c.saas_status === 'inativo') && (
                        <button className="btn btn-primary" style={{ fontSize: 10, padding: '4px 8px' }} onClick={() => ativarTrial(c.id)}>+ Trial</button>
                      )}
                      {(c.saas_status === 'trial' || c.saas_status === 'bloqueado') && (
                        <button className="btn btn-ghost" style={{ fontSize: 10, padding: '4px 8px', color: 'var(--green)', borderColor: 'var(--green)' }} onClick={() => setModalPagamento(c)}>✓ Pago</button>
                      )}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Modal configurar cliente */}
      {modalCliente && (
        <div className="modal-overlay" onMouseDown={e => { if (e.target === e.currentTarget) setModalCliente(null) }}>
          <div className="modal">
            <div className="modal-title">SaaS — {modalCliente.nome}</div>
            <div style={{ display: 'grid', gap: 12, marginBottom: 16 }}>
              <div>
                <label className="label">Status do acesso</label>
                <select className="input" value={form.saas_status} onChange={e => setForm({...form, saas_status: e.target.value})}>
                  <option value="inativo">Inativo</option>
                  <option value="trial">Trial (7 dias)</option>
                  <option value="ativo">Ativo (pago)</option>
                  <option value="bloqueado">Bloqueado</option>
                </select>
              </div>
              <div>
                <label className="label">Mensalidade (R$)</label>
                <input className="input num" type="number" value={form.saas_mensalidade} onChange={e => setForm({...form, saas_mensalidade: e.target.value})} />
              </div>
              <div>
                <label className="label">Senha de acesso do cliente</label>
                <input className="input" type="text" value={form.saas_senha} onChange={e => setForm({...form, saas_senha: e.target.value})} placeholder="Senha que o cliente usará no portal" />
              </div>
            </div>

            {/* Histórico de pagamentos */}
            {pagamentos.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <div className="eyebrow" style={{ marginBottom: 8 }}>Histórico de pagamentos</div>
                {pagamentos.map(p => (
                  <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border)', fontSize: 12 }}>
                    <span style={{ color: 'var(--text2)' }}>{p.mes_referencia}</span>
                    <span className="num" style={{ color: 'var(--green)', fontWeight: 600 }}>R$ {Number(p.valor).toLocaleString('pt-BR')}</span>
                    <span style={{ color: 'var(--text3)' }}>{new Date(p.data_pagamento + 'T12:00:00').toLocaleDateString('pt-BR')}</span>
                  </div>
                ))}
              </div>
            )}

            <div style={{ display: 'flex', gap: 8, justifyContent: 'space-between' }}>
              <button className="btn btn-danger" style={{ fontSize: 11 }} onClick={() => bloquear(modalCliente.id)}>🔒 Bloquear acesso</button>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-ghost" onClick={() => setModalCliente(null)}>Cancelar</button>
                <button className="btn btn-primary" onClick={salvarConfig} disabled={saving}>{saving ? 'Salvando...' : 'Salvar'}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal confirmar pagamento PIX */}
      {modalPagamento && (
        <div className="modal-overlay" onMouseDown={e => { if (e.target === e.currentTarget) setModalPagamento(null) }}>
          <div className="modal">
            <div className="modal-title">Confirmar Pagamento PIX</div>
            <div style={{ background: 'var(--gold-08)', border: '1px solid var(--gold-14)', borderRadius: 10, padding: 16, marginBottom: 16, textAlign: 'center' }}>
              <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 4 }}>Valor a receber</div>
              <div className="num" style={{ fontSize: 28, fontWeight: 800, color: 'var(--accent)' }}>R$ {Number(modalPagamento.saas_mensalidade || 97).toLocaleString('pt-BR')}</div>
              <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4 }}>de {modalPagamento.nome}</div>
            </div>
            <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 16, lineHeight: 1.6 }}>
              Confirme apenas após receber o PIX em <strong style={{ color: 'var(--accent)' }}>{PIX_CHAVE}</strong>. O acesso será liberado automaticamente após a confirmação.
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button className="btn btn-ghost" onClick={() => setModalPagamento(null)}>Cancelar</button>
              <button className="btn btn-primary" onClick={confirmarPagamento}>✓ Confirmar recebimento e liberar acesso</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
