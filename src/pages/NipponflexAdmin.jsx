import React, { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { toast } from '../lib/toast.js'

export default function NipponflexAdmin() {
  const [distribuidores, setDistribuidores] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [selecionado, setSelecionado] = useState(null)
  const [clientes, setClientes] = useState([])
  const [form, setForm] = useState({ nome: '', email: '', senha: '', cidade: '' })
  const [saving, setSaving] = useState(false)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const { data } = await supabase.from('nipponflex_distribuidores').select('*').order('nome')
    // Conta clientes de cada distribuidor
    const com_count = await Promise.all((data || []).map(async d => {
      const { count } = await supabase.from('nipponflex_clientes').select('*', { count: 'exact', head: true }).eq('distribuidor_id', d.id)
      return { ...d, total_clientes: count || 0 }
    }))
    setDistribuidores(com_count)
    setLoading(false)
  }

  async function abrirDistribuidor(d) {
    setSelecionado(d)
    const { data } = await supabase.from('nipponflex_clientes').select('*').eq('distribuidor_id', d.id).order('nome')
    setClientes(data || [])
  }

  async function salvar() {
    if (!form.nome || !form.email || !form.senha) return
    setSaving(true)
    const { error } = await supabase.from('nipponflex_distribuidores').insert(form)
    setSaving(false)
    if (error) { toast.error('E-mail já cadastrado ou erro ao salvar'); return }
    toast.success('Distribuidor cadastrado!')
    setModal(false)
    setForm({ nome: '', email: '', senha: '', cidade: '' })
    await load()
  }

  async function toggleAtivo(id, ativo) {
    await supabase.from('nipponflex_distribuidores').update({ ativo: !ativo }).eq('id', id)
    toast.success(ativo ? 'Acesso bloqueado' : 'Acesso liberado')
    await load()
  }

  async function deletarCliente(id) {
    if (!confirm('Excluir este cliente?')) return
    await supabase.from('nipponflex_clientes').delete().eq('id', id)
    toast.success('Cliente removido')
    setClientes(cs => cs.filter(c => c.id !== id))
    setSelecionado(d => ({ ...d, total_clientes: (d.total_clientes || 1) - 1 }))
  }

  const totalClientes = distribuidores.reduce((a, d) => a + (d.total_clientes || 0), 0)
  const totalAtivos = distribuidores.filter(d => d.ativo).length

  return (
    <div>
      <div className="fade-up" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 className="page-title">Nipponflex — Distribuidores</h1>
          <div className="page-sub">Gerencie o acesso ao portal e visualize os clientes de cada distribuidor</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <a href="/nipponflex" target="_blank" className="btn btn-ghost" style={{ fontSize: 11 }}>↗ Ver portal</a>
          <button className="btn btn-primary" onClick={() => setModal(true)}>+ Novo Distribuidor</button>
        </div>
      </div>

      {/* Métricas */}
      <div className="stagger" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 20 }}>
        {[
          { label: 'Distribuidores', value: distribuidores.length, cor: 'var(--sky)' },
          { label: 'Ativos', value: totalAtivos, cor: 'var(--green)' },
          { label: 'Total de clientes', value: totalClientes, cor: 'var(--accent)' },
        ].map((m, i) => (
          <div key={i} className="card" style={{ borderTop: `2px solid ${m.cor}` }}>
            <div className="eyebrow" style={{ marginBottom: 4 }}>{m.label}</div>
            <div className="num" style={{ fontSize: 24, fontWeight: 700 }}>{m.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: selecionado ? '340px 1fr' : '1fr', gap: 14 }}>
        {/* Lista de distribuidores */}
        <div className="card" style={{ padding: 0, overflow: 'hidden', height: 'fit-content' }}>
          <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)' }}>
            <div className="eyebrow">Distribuidores cadastrados</div>
          </div>
          {loading && <div className="skeleton" style={{ height: 80, margin: 16 }} />}
          {distribuidores.map(d => (
            <div key={d.id}
              onClick={() => abrirDistribuidor(d)}
              style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderBottom: '1px solid var(--border)', cursor: 'pointer', background: selecionado?.id === d.id ? 'var(--gold-08)' : 'transparent', transition: 'background 0.15s' }}
              onMouseEnter={e => { if (selecionado?.id !== d.id) e.currentTarget.style.background = 'var(--bg3)' }}
              onMouseLeave={e => { if (selecionado?.id !== d.id) e.currentTarget.style.background = 'transparent' }}>
              <div style={{ width: 36, height: 36, borderRadius: 9, background: d.ativo ? 'var(--grad-brand)' : 'var(--bg4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: d.ativo ? 'var(--on-accent)' : 'var(--text3)', flexShrink: 0 }}>
                {d.nome.split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.nome}</div>
                <div style={{ fontSize: 10, color: 'var(--text3)' }}>{d.cidade || d.email} · {d.total_clientes} cliente{d.total_clientes !== 1 ? 's' : ''}</div>
              </div>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <span style={{ fontSize: 9, fontWeight: 600, padding: '2px 7px', borderRadius: 99, background: d.ativo ? 'rgba(61,206,140,0.12)' : 'rgba(100,100,100,0.12)', color: d.ativo ? 'var(--green)' : 'var(--text3)' }}>
                  {d.ativo ? 'Ativo' : 'Inativo'}
                </span>
                <button onClick={e => { e.stopPropagation(); toggleAtivo(d.id, d.ativo) }}
                  style={{ background: 'none', border: `1px solid var(--border2)`, borderRadius: 5, padding: '2px 8px', fontSize: 9, color: d.ativo ? 'var(--red)' : 'var(--green)', cursor: 'pointer', fontWeight: 600 }}>
                  {d.ativo ? 'Bloquear' : 'Liberar'}
                </button>
              </div>
            </div>
          ))}
          {!loading && distribuidores.length === 0 && (
            <div style={{ padding: 24, textAlign: 'center', fontSize: 12, color: 'var(--text3)' }}>Nenhum distribuidor cadastrado</div>
          )}
        </div>

        {/* Clientes do distribuidor selecionado */}
        {selecionado && (
          <div className="card fade-up" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div className="eyebrow">Clientes de {selecionado.nome}</div>
                <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 2 }}>{selecionado.email} · Senha: <code style={{ background: 'var(--bg3)', padding: '1px 5px', borderRadius: 4 }}>{selecionado.senha}</code></div>
              </div>
              <button onClick={() => setSelecionado(null)} style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', fontSize: 16 }}>✕</button>
            </div>
            {clientes.length === 0 ? (
              <div style={{ padding: 32, textAlign: 'center', fontSize: 12, color: 'var(--text3)' }}>
                Nenhum cliente cadastrado por este distribuidor ainda
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead><tr>
                  {['Nome','Produto','Compra','Troca Refil','Cidade','WhatsApp','Equipe',''].map(h => (
                    <th key={h} style={{ fontSize: 10, color: 'var(--text3)', padding: '8px 12px', borderBottom: '1px solid var(--border)', textAlign: 'left', fontWeight: 500 }}>{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {clientes.map(c => {
                    const hoje = new Date()
                    const troca = c.data_troca_refil ? new Date(c.data_troca_refil + 'T12:00:00') : null
                    const dias = troca ? Math.ceil((troca - hoje) / (1000 * 60 * 60 * 24)) : null
                    return (
                      <tr key={c.id} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '9px 12px', fontSize: 12, fontWeight: 500 }}>{c.nome}</td>
                        <td style={{ padding: '9px 12px', fontSize: 11, color: 'var(--text2)' }}>{c.produto || '—'}</td>
                        <td style={{ padding: '9px 12px', fontSize: 11, color: 'var(--text3)' }}>{c.data_compra ? new Date(c.data_compra + 'T12:00:00').toLocaleDateString('pt-BR') : '—'}</td>
                        <td style={{ padding: '9px 12px', fontSize: 11 }}>
                          <span style={{ color: dias !== null && dias <= 7 ? 'var(--amber)' : 'var(--text3)' }}>
                            {troca ? troca.toLocaleDateString('pt-BR') : '—'}
                            {dias !== null && dias <= 7 && <span style={{ fontSize: 9, marginLeft: 4 }}>({dias}d)</span>}
                          </span>
                        </td>
                        <td style={{ padding: '9px 12px', fontSize: 11, color: 'var(--text3)' }}>{c.cidade || '—'}</td>
                        <td style={{ padding: '9px 12px', fontSize: 11 }}>
                          {c.whatsapp ? <a href={`https://wa.me/55${c.whatsapp.replace(/\D/g,'')}`} target="_blank" rel="noreferrer" style={{ color: 'var(--green)', textDecoration: 'none' }}>{c.whatsapp}</a> : '—'}
                        </td>
                        <td style={{ padding: '9px 12px' }}>
                          <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 99, background: c.entrou_equipe ? 'rgba(61,206,140,0.12)' : 'var(--bg4)', color: c.entrou_equipe ? 'var(--green)' : 'var(--text3)', fontWeight: 600 }}>
                            {c.entrou_equipe ? 'Sim' : 'Não'}
                          </span>
                        </td>
                        <td style={{ padding: '9px 12px' }}>
                          <button onClick={() => deletarCliente(c.id)} style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', fontSize: 12 }}>✕</button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      {/* Modal novo distribuidor */}
      {modal && (
        <div className="modal-overlay" onMouseDown={e => { if (e.target === e.currentTarget) setModal(false) }}>
          <div className="modal">
            <div className="modal-title">Novo Distribuidor Nipponflex</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
              <div style={{ gridColumn: '1/-1' }}>
                <label className="label">Nome completo *</label>
                <input className="input" value={form.nome} onChange={e => setForm({...form, nome: e.target.value})} placeholder="Nome do distribuidor" autoFocus />
              </div>
              <div>
                <label className="label">E-mail de acesso *</label>
                <input className="input" type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} placeholder="email@exemplo.com" />
              </div>
              <div>
                <label className="label">Senha *</label>
                <input className="input" value={form.senha} onChange={e => setForm({...form, senha: e.target.value})} placeholder="Senha de acesso" />
              </div>
              <div style={{ gridColumn: '1/-1' }}>
                <label className="label">Cidade</label>
                <input className="input" value={form.cidade} onChange={e => setForm({...form, cidade: e.target.value})} placeholder="Cidade de atuação" />
              </div>
            </div>
            <div style={{ background: 'var(--bg3)', borderRadius: 7, padding: '10px 12px', marginBottom: 16, fontSize: 11, color: 'var(--text3)', lineHeight: 1.5 }}>
              O distribuidor acessa em <strong style={{ color: 'var(--accent)' }}>flowcrm-steel.vercel.app/nipponflex</strong> com o e-mail e senha acima. Ele só vê os próprios clientes.
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button className="btn btn-ghost" onClick={() => setModal(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={salvar} disabled={!form.nome || !form.email || !form.senha || saving}>
                {saving ? 'Salvando...' : 'Cadastrar distribuidor'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
