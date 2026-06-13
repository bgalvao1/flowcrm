import React, { useEffect, useState } from 'react'
import { precificacaoAPI } from '../lib/supabase.js'
import { toast } from '../lib/toast.js'

const CATEGORIAS = ['Marketing','Desenvolvimento','Design','Consultoria','IA & Automação','Gestão de Conteúdo']

function calcPreco(horas, custoHora, margem) {
  const custo = horas * custoHora
  return custo * (1 + margem / 100)
}

export default function Precificacao() {
  const [servicos, setServicos] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [editando, setEditando] = useState(null)
  const [form, setForm] = useState({ nome: '', categoria: 'Marketing', horas_estimadas: '', custo_hora: '150', margem_pct: '30', preco_final: '' })
  const [saving, setSaving] = useState(false)
  const [simHoras, setSimHoras] = useState('')
  const [simCusto, setSimCusto] = useState('150')
  const [simMargem, setSimMargem] = useState('50')

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const { data } = await precificacaoAPI.listar()
    setServicos(data || [])
    setLoading(false)
  }

  const precoCalc = calcPreco(parseFloat(form.horas_estimadas) || 0, parseFloat(form.custo_hora) || 0, parseFloat(form.margem_pct) || 0)

  async function handleSave() {
    if (!form.nome) return
    setSaving(true)
    const dados = { ...form, horas_estimadas: parseFloat(form.horas_estimadas) || 0, custo_hora: parseFloat(form.custo_hora) || 0, margem_pct: parseFloat(form.margem_pct) || 0, preco_final: precoCalc }
    const { error } = editando ? await precificacaoAPI.atualizar(editando.id, dados) : await precificacaoAPI.criar(dados)
    setSaving(false)
    if (error) { toast.error('Erro ao salvar'); return }
    toast.success(editando ? 'Serviço atualizado' : 'Serviço criado')
    setModal(false); setEditando(null); setForm({ nome: '', categoria: 'Marketing', horas_estimadas: '', custo_hora: '150', margem_pct: '30', preco_final: '' })
    await load()
  }

  async function deletar(id) {
    if (!confirm('Excluir este serviço?')) return
    await precificacaoAPI.deletar(id)
    toast.success('Serviço removido')
    await load()
  }

  function abrirEdicao(s) {
    setEditando(s)
    setForm({ nome: s.nome, categoria: s.categoria, horas_estimadas: String(s.horas_estimadas), custo_hora: String(s.custo_hora), margem_pct: String(s.margem_pct), preco_final: '' })
    setModal(true)
  }

  const cats = [...new Set(servicos.map(s => s.categoria))]
  const precoSim = calcPreco(parseFloat(simHoras) || 0, parseFloat(simCusto) || 0, parseFloat(simMargem) || 0)

  return (
    <div>
      <div className="fade-up" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 className="page-title">Precificação</h1>
          <div className="page-sub">Calculadora de preços por horas, custo e margem</div>
        </div>
        <button className="btn btn-primary" onClick={() => { setEditando(null); setForm({ nome: '', categoria: 'Marketing', horas_estimadas: '', custo_hora: '150', margem_pct: '30', preco_final: '' }); setModal(true) }}>+ Novo Serviço</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 14 }}>
        {/* Tabela de serviços */}
        <div>
          {cats.map(cat => (
            <div key={cat} style={{ marginBottom: 16 }}>
              <div className="eyebrow" style={{ marginBottom: 8, paddingLeft: 4 }}>{cat}</div>
              <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead><tr>
                    {['Serviço','Horas est.','Custo/h','Margem','Preço Final',''].map(h => (
                      <th key={h} style={{ fontSize: 10, color: 'var(--text3)', padding: '8px 14px', borderBottom: '1px solid var(--border)', textAlign: 'left', fontWeight: 500 }}>{h}</th>
                    ))}
                  </tr></thead>
                  <tbody>
                    {loading && <tr><td colSpan={6} style={{ padding: 16 }}><div className="skeleton" style={{ height: 20 }} /></td></tr>}
                    {servicos.filter(s => s.categoria === cat).map(s => (
                      <tr key={s.id} style={{ borderBottom: '1px solid var(--border)', cursor: 'pointer' }} onClick={() => abrirEdicao(s)}>
                        <td style={{ padding: '10px 14px', fontSize: 12, fontWeight: 500 }}>{s.nome}</td>
                        <td style={{ padding: '10px 14px', fontSize: 12, color: 'var(--text3)', fontFamily: 'var(--font-mono)' }}>{Number(s.horas_estimadas).toFixed(0)}h</td>
                        <td style={{ padding: '10px 14px', fontSize: 12, color: 'var(--text3)', fontFamily: 'var(--font-mono)' }}>R$ {Number(s.custo_hora).toFixed(0)}</td>
                        <td style={{ padding: '10px 14px' }}><span className="badge badge-amber">{Number(s.margem_pct).toFixed(0)}%</span></td>
                        <td style={{ padding: '10px 14px', fontSize: 13, fontWeight: 700, color: 'var(--accent)', fontFamily: 'var(--font-mono)' }}>R$ {Number(s.preco_final).toLocaleString('pt-BR', { minimumFractionDigits: 0 })}</td>
                        <td style={{ padding: '10px 14px' }} onClick={e => { e.stopPropagation(); deletar(s.id) }}>
                          <button style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', fontSize: 12 }}>✕</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
          {!loading && servicos.length === 0 && (
            <div className="card" style={{ textAlign: 'center', padding: 40 }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>💰</div>
              <div style={{ fontSize: 12, color: 'var(--text3)' }}>Nenhum serviço cadastrado. Crie a tabela de preços da agência.</div>
            </div>
          )}
        </div>

        {/* Simulador rápido */}
        <div>
          <div className="card" style={{ position: 'sticky', top: 0 }}>
            <div className="eyebrow" style={{ marginBottom: 16 }}>⚡ Simulador rápido</div>
            <div style={{ marginBottom: 12 }}>
              <label className="label">Horas estimadas</label>
              <input className="input num" type="number" value={simHoras} onChange={e => setSimHoras(e.target.value)} placeholder="0" />
            </div>
            <div style={{ marginBottom: 12 }}>
              <label className="label">Custo por hora (R$)</label>
              <input className="input num" type="number" value={simCusto} onChange={e => setSimCusto(e.target.value)} />
            </div>
            <div style={{ marginBottom: 20 }}>
              <label className="label">Margem desejada (%)</label>
              <input className="input num" type="number" value={simMargem} onChange={e => setSimMargem(e.target.value)} />
            </div>
            <div style={{ background: 'var(--gold-08)', border: '1px solid var(--gold-14)', borderRadius: 10, padding: 16, textAlign: 'center' }}>
              <div className="eyebrow" style={{ marginBottom: 6 }}>Preço sugerido</div>
              <div className="num" style={{ fontSize: 28, fontWeight: 800, color: 'var(--accent)' }}>R$ {precoSim.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}</div>
              {simHoras > 0 && (
                <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 8 }}>
                  Custo: R$ {(parseFloat(simHoras) * parseFloat(simCusto)).toLocaleString('pt-BR')} · Lucro: R$ {(precoSim - parseFloat(simHoras) * parseFloat(simCusto)).toLocaleString('pt-BR', { minimumFractionDigits: 0 })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {modal && (
        <div className="modal-overlay" onMouseDown={e => { if (e.target === e.currentTarget) { setModal(false); setEditando(null) } }}>
          <div className="modal">
            <div className="modal-title">{editando ? 'Editar Serviço' : 'Novo Serviço'}</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
              <div style={{ gridColumn: '1/-1' }}>
                <label className="label">Nome do serviço *</label>
                <input className="input" value={form.nome} onChange={e => setForm({...form, nome: e.target.value})} placeholder="Ex: Gestão de Tráfego Pago" autoFocus />
              </div>
              <div>
                <label className="label">Categoria</label>
                <select className="input" value={form.categoria} onChange={e => setForm({...form, categoria: e.target.value})}>
                  {CATEGORIAS.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Horas estimadas</label>
                <input className="input num" type="number" value={form.horas_estimadas} onChange={e => setForm({...form, horas_estimadas: e.target.value})} placeholder="0" />
              </div>
              <div>
                <label className="label">Custo por hora (R$)</label>
                <input className="input num" type="number" value={form.custo_hora} onChange={e => setForm({...form, custo_hora: e.target.value})} />
              </div>
              <div>
                <label className="label">Margem (%)</label>
                <input className="input num" type="number" value={form.margem_pct} onChange={e => setForm({...form, margem_pct: e.target.value})} />
              </div>
            </div>
            {form.horas_estimadas && (
              <div style={{ background: 'var(--gold-08)', borderRadius: 8, padding: '10px 14px', marginBottom: 14 }}>
                <div style={{ fontSize: 11, color: 'var(--text3)' }}>Preço calculado automaticamente</div>
                <div className="num" style={{ fontSize: 20, fontWeight: 700, color: 'var(--accent)' }}>R$ {precoCalc.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}</div>
              </div>
            )}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button className="btn btn-ghost" onClick={() => { setModal(false); setEditando(null) }}>Cancelar</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={!form.nome || saving}>{saving ? 'Salvando...' : 'Salvar'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
