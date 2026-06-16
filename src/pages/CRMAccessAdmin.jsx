import React, { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { toast } from '../lib/toast.js'

const PLANOS = { '1mes': { label: '1 mês', dias: 30, valor: 69.90 }, '3meses': { label: '3 meses', dias: 90, valor: 97.00 } }

export default function CRMAccessAdmin() {
  const [empresas, setEmpresas] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [modalPix, setModalPix] = useState(null)
  const [form, setForm] = useState({ nome: '', email: '', senha: '', plano: '1mes' })
  const [saving, setSaving] = useState(false)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const { data } = await supabase.from('crm_empresas').select('*').order('nome')
    setEmpresas(data || [])
    setLoading(false)
  }

  async function salvar() {
    if (!form.nome || !form.email || !form.senha) return
    setSaving(true)
    const plano = PLANOS[form.plano]
    const venc = new Date()
    venc.setDate(venc.getDate() + plano.dias)
    const { error } = await supabase.from('crm_empresas').insert({
      ...form, valor: plano.valor, status: 'ativo',
      vencimento: venc.toISOString().split('T')[0],
    })
    setSaving(false)
    if (error) { toast.error('E-mail já cadastrado ou erro ao salvar'); return }
    toast.success('Empresa adicionada e acesso liberado!')
    setModal(false); setForm({ nome: '', email: '', senha: '', plano: '1mes' })
    await load()
  }

  async function confirmarPix(empresa) {
    const plano = PLANOS[empresa.plano || '1mes']
    const venc = new Date()
    venc.setDate(venc.getDate() + plano.dias)
    await supabase.from('crm_empresas').update({
      status: 'ativo',
      vencimento: venc.toISOString().split('T')[0],
      pix_confirmado: true,
    }).eq('id', empresa.id)
    toast.success(`Acesso de ${empresa.nome} renovado por ${plano.label}!`)
    setModalPix(null)
    await load()
  }

  async function bloquear(id, nome) {
    await supabase.from('crm_empresas').update({ status: 'bloqueado' }).eq('id', id)
    toast.success(`${nome} bloqueado`)
    await load()
  }

  async function alterarPlano(id, plano) {
    await supabase.from('crm_empresas').update({ plano, valor: PLANOS[plano].valor }).eq('id', id)
    toast.success('Plano atualizado')
    await load()
  }

  const mrr = empresas.filter(e => e.status === 'ativo').reduce((a, e) => a + Number(e.valor || 0), 0)

  return (
    <div>
      <div className="fade-up" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 className="page-title">Acesso CRM — Empresas</h1>
          <div className="page-sub">Nova Energia · FBS Consultoria e futuros clientes</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <a href="/acesso" target="_blank" className="btn btn-ghost" style={{ fontSize: 11 }}>↗ Ver portal</a>
          <button className="btn btn-primary" onClick={() => setModal(true)}>+ Adicionar empresa</button>
        </div>
      </div>

      {/* Métricas */}
      <div className="stagger" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 20 }}>
        {[
          { label: 'Empresas', value: empresas.length, cor: 'var(--sky)' },
          { label: 'Ativas', value: empresas.filter(e => e.status === 'ativo').length, cor: 'var(--green)' },
          { label: 'Bloqueadas', value: empresas.filter(e => e.status === 'bloqueado').length, cor: 'var(--red)' },
          { label: 'Receita total', value: `R$ ${mrr.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, cor: 'var(--accent)' },
        ].map((m, i) => (
          <div key={i} className="card" style={{ borderTop: `2px solid ${m.cor}` }}>
            <div className="eyebrow" style={{ marginBottom: 4 }}>{m.label}</div>
            <div className="num" style={{ fontSize: 20, fontWeight: 700 }}>{m.value}</div>
          </div>
        ))}
      </div>

      {/* Link */}
      <div className="card fade-up" style={{ marginBottom: 18, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ fontSize: 18 }}>🔗</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text1)' }}>Link de acesso dos clientes</div>
          <div style={{ fontSize: 11, color: 'var(--text3)' }}>Envie este link para cada empresa após confirmar o pagamento</div>
        </div>
        <code style={{ fontSize: 12, color: 'var(--accent)', background: 'var(--bg3)', padding: '6px 12px', borderRadius: 7 }}>flowcrm-steel.vercel.app/acesso</code>
        <button className="btn btn-ghost" style={{ fontSize: 11 }} onClick={() => { navigator.clipboard.writeText('https://flowcrm-steel.vercel.app/acesso'); toast.success('Link copiado!') }}>
          📋 Copiar
        </button>
      </div>

      {/* Tabela */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr>
            {['Empresa','E-mail','Plano','Valor','Vencimento','Status','Ações'].map(h => (
              <th key={h} style={{ fontSize: 10, color: 'var(--text3)', padding: '10px 14px', borderBottom: '1px solid var(--border)', textAlign: 'left', fontWeight: 500 }}>{h}</th>
            ))}
          </tr></thead>
          <tbody>
            {loading && <tr><td colSpan={7} style={{ padding: 20 }}><div className="skeleton" style={{ height: 20 }} /></td></tr>}
            {empresas.map(e => {
              const venc = e.vencimento ? new Date(e.vencimento + 'T23:59:59') : null
              const dias = venc ? Math.ceil((venc - new Date()) / (1000 * 60 * 60 * 24)) : null
              const vencido = dias !== null && dias < 0
              return (
                <tr key={e.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '11px 14px', fontSize: 13, fontWeight: 600 }}>{e.nome}</td>
                  <td style={{ padding: '11px 14px', fontSize: 11, color: 'var(--text3)' }}>{e.email}</td>
                  <td style={{ padding: '11px 14px' }}>
                    <select value={e.plano || '1mes'} onChange={ev => alterarPlano(e.id, ev.target.value)}
                      style={{ background: 'var(--bg3)', border: '1px solid var(--border2)', borderRadius: 6, padding: '3px 8px', fontSize: 11, color: 'var(--text2)', cursor: 'pointer' }}>
                      <option value="1mes">1 mês — R$ 69,90</option>
                      <option value="3meses">3 meses — R$ 97,00</option>
                    </select>
                  </td>
                  <td style={{ padding: '11px 14px', fontSize: 12, fontWeight: 600, color: 'var(--accent)', fontFamily: 'var(--font-mono)' }}>
                    R$ {Number(e.valor || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </td>
                  <td style={{ padding: '11px 14px', fontSize: 11, color: vencido ? 'var(--red)' : dias !== null && dias <= 7 ? 'var(--amber)' : 'var(--text3)' }}>
                    {venc ? venc.toLocaleDateString('pt-BR') : '—'}
                    {dias !== null && <span style={{ marginLeft: 4, fontSize: 9 }}>({vencido ? 'vencido' : `${dias}d`})</span>}
                  </td>
                  <td style={{ padding: '11px 14px' }}>
                    <span style={{ fontSize: 10, fontWeight: 600, padding: '3px 8px', borderRadius: 99, background: e.status === 'ativo' ? 'rgba(61,206,140,0.12)' : 'rgba(232,100,91,0.12)', color: e.status === 'ativo' ? 'var(--green)' : 'var(--red)' }}>
                      {e.status === 'ativo' ? '✓ Ativo' : '🔒 Bloqueado'}
                    </span>
                  </td>
                  <td style={{ padding: '11px 14px' }}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="btn btn-ghost" style={{ fontSize: 10, padding: '4px 10px', color: 'var(--green)', borderColor: 'rgba(61,206,140,0.3)' }} onClick={() => setModalPix(e)}>
                        ✓ Confirmar PIX
                      </button>
                      {e.status === 'ativo' && (
                        <button className="btn btn-ghost" style={{ fontSize: 10, padding: '4px 10px', color: 'var(--red)', borderColor: 'rgba(232,100,91,0.3)' }} onClick={() => bloquear(e.id, e.nome)}>
                          Bloquear
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Modal nova empresa */}
      {modal && (
        <div className="modal-overlay" onMouseDown={e => { if (e.target === e.currentTarget) setModal(false) }}>
          <div className="modal">
            <div className="modal-title">Adicionar Empresa</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
              <div style={{ gridColumn: '1/-1' }}>
                <label className="label">Nome da empresa *</label>
                <input className="input" value={form.nome} onChange={e => setForm({...form, nome: e.target.value})} placeholder="Ex: Empresa XYZ" autoFocus />
              </div>
              <div>
                <label className="label">E-mail de acesso *</label>
                <input className="input" type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} placeholder="email@empresa.com" />
              </div>
              <div>
                <label className="label">Senha *</label>
                <input className="input" value={form.senha} onChange={e => setForm({...form, senha: e.target.value})} placeholder="Senha de acesso" />
              </div>
              <div style={{ gridColumn: '1/-1' }}>
                <label className="label">Plano</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  {Object.entries(PLANOS).map(([id, p]) => (
                    <button key={id} onClick={() => setForm({...form, plano: id})} type="button"
                      style={{ padding: '12px', borderRadius: 9, border: `2px solid ${form.plano === id ? 'var(--accent)' : 'var(--border2)'}`, background: form.plano === id ? 'var(--gold-08)' : 'var(--bg3)', cursor: 'pointer', textAlign: 'center', transition: 'all 0.15s' }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: form.plano === id ? 'var(--accent)' : 'var(--text2)', marginBottom: 2 }}>{p.label}</div>
                      <div className="num" style={{ fontSize: 18, fontWeight: 800, color: form.plano === id ? 'var(--accent)' : 'var(--text3)' }}>R$ {p.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div style={{ fontSize: 11, color: 'var(--text3)', background: 'var(--bg3)', borderRadius: 7, padding: '8px 12px', marginBottom: 14 }}>
              O acesso será liberado imediatamente por {PLANOS[form.plano].dias} dias após confirmar.
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button className="btn btn-ghost" onClick={() => setModal(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={salvar} disabled={!form.nome || !form.email || !form.senha || saving}>
                {saving ? 'Salvando...' : 'Adicionar e liberar acesso'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal confirmar PIX */}
      {modalPix && (
        <div className="modal-overlay" onMouseDown={e => { if (e.target === e.currentTarget) setModalPix(null) }}>
          <div className="modal">
            <div className="modal-title">Confirmar pagamento PIX</div>
            <div style={{ background: 'var(--gold-08)', border: '1px solid var(--gold-14)', borderRadius: 10, padding: 20, textAlign: 'center', marginBottom: 16 }}>
              <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 4 }}>{modalPix.nome} · {PLANOS[modalPix.plano || '1mes'].label}</div>
              <div className="num" style={{ fontSize: 30, fontWeight: 800, color: 'var(--accent)' }}>
                R$ {Number(modalPix.valor || PLANOS[modalPix.plano || '1mes'].valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </div>
            </div>
            <div style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.6, marginBottom: 16 }}>
              Confirme apenas após receber o PIX em <strong style={{ color: 'var(--accent)' }}>bgalvao1@gmail.com</strong>. O acesso será renovado por mais <strong>{PLANOS[modalPix.plano || '1mes'].dias} dias</strong>.
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button className="btn btn-ghost" onClick={() => setModalPix(null)}>Cancelar</button>
              <button className="btn btn-primary" onClick={() => confirmarPix(modalPix)}>✓ Recebi o PIX — Liberar acesso</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
