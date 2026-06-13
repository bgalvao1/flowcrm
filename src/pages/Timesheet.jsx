import React, { useEffect, useState } from 'react'
import { timesheetAPI, clientesAPI, projetosAPI } from '../lib/supabase.js'
import { toast } from '../lib/toast.js'

const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']
const hoje = new Date()

export default function Timesheet() {
  const [registros, setRegistros] = useState([])
  const [clientes, setClientes] = useState([])
  const [projetos, setProjetos] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [mes, setMes] = useState(hoje.getMonth() + 1)
  const [ano, setAno] = useState(hoje.getFullYear())
  const [form, setForm] = useState({ projeto_id: '', cliente_id: '', colaborador: 'Bruno Galvão', descricao: '', horas: '', custo_hora: '150', data_registro: hoje.toISOString().split('T')[0] })
  const [saving, setSaving] = useState(false)

  useEffect(() => { load() }, [mes, ano])

  async function load() {
    setLoading(true)
    const [{ data: r }, { data: c }, { data: p }] = await Promise.all([
      timesheetAPI.listar(mes, ano),
      clientesAPI.listar(),
      projetosAPI.listar(),
    ])
    setRegistros(r || [])
    setClientes(c || [])
    setProjetos(p || [])
    setLoading(false)
  }

  async function handleSave() {
    if (!form.horas || !form.descricao) return
    setSaving(true)
    const custo = parseFloat(form.custo_hora) || 0
    const horas = parseFloat(form.horas) || 0
    const { error } = await timesheetAPI.criar({ ...form, horas, custo_hora: custo })
    setSaving(false)
    if (error) { toast.error('Erro ao salvar'); return }
    toast.success('Horas registradas')
    setModal(false)
    setForm(f => ({ ...f, descricao: '', horas: '' }))
    await load()
  }

  async function deletar(id) {
    if (!confirm('Remover este registro?')) return
    await timesheetAPI.deletar(id)
    toast.success('Registro removido')
    await load()
  }

  const totalHoras = registros.reduce((a, r) => a + Number(r.horas), 0)
  const totalValor = registros.reduce((a, r) => a + (Number(r.horas) * Number(r.custo_hora)), 0)

  // Agrupa por cliente
  const porCliente = registros.reduce((acc, r) => {
    const nome = r.clientes?.nome || r.projetos?.nome || 'Sem vínculo'
    if (!acc[nome]) acc[nome] = { horas: 0, valor: 0 }
    acc[nome].horas += Number(r.horas)
    acc[nome].valor += Number(r.horas) * Number(r.custo_hora)
    return acc
  }, {})

  return (
    <div>
      <div className="fade-up" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 className="page-title">Timesheet</h1>
          <div className="page-sub">Controle de horas por projeto e colaborador</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <select className="input" style={{ width: 140 }} value={mes} onChange={e => setMes(Number(e.target.value))}>
            {MESES.map((m, i) => <option key={i} value={i+1}>{m}</option>)}
          </select>
          <select className="input" style={{ width: 90 }} value={ano} onChange={e => setAno(Number(e.target.value))}>
            {[2024,2025,2026].map(y => <option key={y}>{y}</option>)}
          </select>
          <button className="btn btn-primary" onClick={() => setModal(true)}>+ Registrar horas</button>
        </div>
      </div>

      {/* Resumo */}
      <div className="stagger" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 18 }}>
        <div className="card" style={{ borderTop: '2px solid var(--accent)' }}>
          <div className="eyebrow" style={{ marginBottom: 4 }}>Total de Horas</div>
          <div className="num" style={{ fontSize: 24, fontWeight: 700 }}>{totalHoras.toFixed(1)}h</div>
        </div>
        <div className="card" style={{ borderTop: '2px solid var(--green)' }}>
          <div className="eyebrow" style={{ marginBottom: 4 }}>Valor Total</div>
          <div className="num" style={{ fontSize: 24, fontWeight: 700 }}>R$ {totalValor.toLocaleString('pt-BR')}</div>
        </div>
        <div className="card" style={{ borderTop: '2px solid var(--sky)' }}>
          <div className="eyebrow" style={{ marginBottom: 4 }}>Clientes atendidos</div>
          <div className="num" style={{ fontSize: 24, fontWeight: 700 }}>{Object.keys(porCliente).length}</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 14 }}>
        {/* Tabela de registros */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div className="eyebrow">Registros — {MESES[mes-1]} {ano}</div>
          </div>
          {loading ? <div className="skeleton" style={{ height: 100, margin: 16, borderRadius: 8 }} /> : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>{['Data','Colaborador','Projeto / Cliente','Descrição','Horas','Valor',''].map(h => (
                  <th key={h} style={{ fontSize: 10, color: 'var(--text3)', padding: '8px 14px', borderBottom: '1px solid var(--border)', textAlign: 'left', fontWeight: 500 }}>{h}</th>
                ))}</tr>
              </thead>
              <tbody>
                {registros.length === 0 && <tr><td colSpan={7} style={{ padding: 20, color: 'var(--text3)', fontSize: 12 }}>Nenhum registro neste mês</td></tr>}
                {registros.map(r => (
                  <tr key={r.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '9px 14px', fontSize: 11, color: 'var(--text3)' }}>{new Date(r.data_registro + 'T12:00:00').toLocaleDateString('pt-BR')}</td>
                    <td style={{ padding: '9px 14px', fontSize: 12 }}>{r.colaborador}</td>
                    <td style={{ padding: '9px 14px', fontSize: 11, color: 'var(--text2)' }}>{r.projetos?.nome || r.clientes?.nome || '—'}</td>
                    <td style={{ padding: '9px 14px', fontSize: 11, color: 'var(--text2)', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.descricao}</td>
                    <td style={{ padding: '9px 14px', fontSize: 12, fontWeight: 600, color: 'var(--accent)', fontFamily: 'var(--font-mono)' }}>{Number(r.horas).toFixed(1)}h</td>
                    <td style={{ padding: '9px 14px', fontSize: 11, color: 'var(--green)', fontFamily: 'var(--font-mono)' }}>R$ {(Number(r.horas) * Number(r.custo_hora)).toLocaleString('pt-BR')}</td>
                    <td style={{ padding: '9px 14px' }}>
                      <button onClick={() => deletar(r.id)} style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', fontSize: 12 }}>✕</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Resumo por cliente */}
        <div className="card">
          <div className="eyebrow" style={{ marginBottom: 12 }}>Por cliente / projeto</div>
          {Object.entries(porCliente).sort((a,b) => b[1].horas - a[1].horas).map(([nome, d]) => (
            <div key={nome} style={{ padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                <span style={{ fontSize: 12, color: 'var(--text1)', fontWeight: 500 }}>{nome}</span>
                <span className="num" style={{ fontSize: 11, color: 'var(--accent)', fontWeight: 600 }}>{d.horas.toFixed(1)}h</span>
              </div>
              <div style={{ fontSize: 10, color: 'var(--text3)' }}>R$ {d.valor.toLocaleString('pt-BR')}</div>
              <div style={{ height: 3, background: 'var(--bg4)', borderRadius: 2, marginTop: 5 }}>
                <div style={{ height: '100%', width: `${(d.horas / totalHoras) * 100}%`, background: 'var(--grad-brand)', borderRadius: 2 }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {modal && (
        <div className="modal-overlay" onMouseDown={e => { if (e.target === e.currentTarget) setModal(false) }}>
          <div className="modal">
            <div className="modal-title">Registrar Horas</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
              <div>
                <label className="label">Data *</label>
                <input className="input" type="date" value={form.data_registro} onChange={e => setForm({...form, data_registro: e.target.value})} />
              </div>
              <div>
                <label className="label">Colaborador</label>
                <input className="input" value={form.colaborador} onChange={e => setForm({...form, colaborador: e.target.value})} />
              </div>
              <div>
                <label className="label">Projeto</label>
                <select className="input" value={form.projeto_id} onChange={e => setForm({...form, projeto_id: e.target.value})}>
                  <option value="">—</option>
                  {projetos.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Cliente</label>
                <select className="input" value={form.cliente_id} onChange={e => setForm({...form, cliente_id: e.target.value})}>
                  <option value="">—</option>
                  {clientes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                </select>
              </div>
              <div style={{ gridColumn: '1/-1' }}>
                <label className="label">Descrição *</label>
                <input className="input" value={form.descricao} onChange={e => setForm({...form, descricao: e.target.value})} placeholder="O que foi feito?" />
              </div>
              <div>
                <label className="label">Horas *</label>
                <input className="input num" type="number" step="0.5" value={form.horas} onChange={e => setForm({...form, horas: e.target.value})} placeholder="0.0" />
              </div>
              <div>
                <label className="label">Custo/hora (R$)</label>
                <input className="input num" type="number" value={form.custo_hora} onChange={e => setForm({...form, custo_hora: e.target.value})} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button className="btn btn-ghost" onClick={() => setModal(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={!form.horas || !form.descricao || saving}>{saving ? 'Salvando...' : 'Registrar'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
