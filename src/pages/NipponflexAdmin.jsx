import React, { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { toast } from '../lib/toast.js'

export default function NipponflexAdmin() {
  const [distribuidores, setDistribuidores] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    // Apenas nome, cidade, e-mail e status — SEM acesso aos clientes
    const { data } = await supabase
      .from('nipponflex_distribuidores')
      .select('id, nome, email, cidade, ativo, criado_em')
      .order('nome')
    setDistribuidores(data || [])
    setLoading(false)
  }

  async function toggleAtivo(id, ativo) {
    await supabase.from('nipponflex_distribuidores').update({ ativo: !ativo }).eq('id', id)
    toast.success(ativo ? 'Acesso bloqueado' : 'Acesso liberado')
    await load()
  }

  async function deletar(id, nome) {
    if (!confirm(`Remover ${nome} do grupo? Esta ação não apaga os dados dele.`)) return
    await supabase.from('nipponflex_distribuidores').update({ ativo: false }).eq('id', id)
    toast.success('Distribuidor removido do grupo')
    await load()
  }

  const ativos = distribuidores.filter(d => d.ativo).length

  return (
    <div>
      <div className="fade-up" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 className="page-title">Nipponflex — Grupo</h1>
          <div className="page-sub">Gerenciamento de acesso ao portal — dados dos distribuidores são privados</div>
        </div>
        <a href="/nipponflex" target="_blank" className="btn btn-ghost" style={{ fontSize: 11 }}>↗ Ver portal</a>
      </div>

      {/* Aviso de privacidade */}
      <div className="card fade-up" style={{ marginBottom: 20, borderLeft: '3px solid var(--sky)', display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{ fontSize: 28, flexShrink: 0 }}>🔒</div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text1)', marginBottom: 2 }}>Dados 100% privados</div>
          <div style={{ fontSize: 12, color: 'var(--text3)', lineHeight: 1.5 }}>
            Os clientes e informações de cada distribuidor são exclusivos deles. Você só vê quem está no grupo e pode controlar o acesso ao portal — nenhum dado é visível aqui.
          </div>
        </div>
      </div>

      {/* Métricas */}
      <div className="stagger" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
        <div className="card" style={{ borderTop: '2px solid var(--sky)' }}>
          <div className="eyebrow" style={{ marginBottom: 4 }}>No grupo</div>
          <div className="num" style={{ fontSize: 24, fontWeight: 700 }}>{distribuidores.length}</div>
          <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>distribuidores cadastrados</div>
        </div>
        <div className="card" style={{ borderTop: '2px solid var(--green)' }}>
          <div className="eyebrow" style={{ marginBottom: 4 }}>Com acesso ativo</div>
          <div className="num" style={{ fontSize: 24, fontWeight: 700 }}>{ativos}</div>
          <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>podem acessar o portal</div>
        </div>
      </div>

      {/* Lista */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div className="eyebrow">Distribuidores do grupo</div>
          <div style={{ fontSize: 11, color: 'var(--text3)' }}>Link de acesso: <strong style={{ color: 'var(--accent)' }}>flowcrm-steel.vercel.app/nipponflex</strong></div>
        </div>
        {loading && <div className="skeleton" style={{ height: 80, margin: 16 }} />}
        {!loading && distribuidores.length === 0 && (
          <div style={{ padding: 32, textAlign: 'center', fontSize: 12, color: 'var(--text3)' }}>
            Nenhum distribuidor cadastrado ainda. Compartilhe o link com o grupo!
          </div>
        )}
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            {distribuidores.length > 0 && (
              <tr>{['Nome','Cidade','E-mail','Cadastro','Status','Acesso'].map(h => (
                <th key={h} style={{ fontSize: 10, color: 'var(--text3)', padding: '8px 16px', borderBottom: '1px solid var(--border)', textAlign: 'left', fontWeight: 500 }}>{h}</th>
              ))}</tr>
            )}
          </thead>
          <tbody>
            {distribuidores.map(d => (
              <tr key={d.id} style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={{ padding: '11px 16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 28, height: 28, borderRadius: 7, background: d.ativo ? 'var(--grad-brand)' : 'var(--bg4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: d.ativo ? 'var(--on-accent)' : 'var(--text3)', flexShrink: 0 }}>
                      {d.nome.split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase()}
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 600 }}>{d.nome}</span>
                  </div>
                </td>
                <td style={{ padding: '11px 16px', fontSize: 11, color: 'var(--text3)' }}>{d.cidade || '—'}</td>
                <td style={{ padding: '11px 16px', fontSize: 11, color: 'var(--text3)' }}>{d.email}</td>
                <td style={{ padding: '11px 16px', fontSize: 11, color: 'var(--text3)' }}>{new Date(d.criado_em).toLocaleDateString('pt-BR')}</td>
                <td style={{ padding: '11px 16px' }}>
                  <span style={{ fontSize: 10, fontWeight: 600, padding: '3px 8px', borderRadius: 99, background: d.ativo ? 'rgba(61,206,140,0.12)' : 'rgba(100,100,100,0.1)', color: d.ativo ? 'var(--green)' : 'var(--text3)' }}>
                    {d.ativo ? '✓ Ativo' : '— Inativo'}
                  </span>
                </td>
                <td style={{ padding: '11px 16px' }}>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button onClick={() => toggleAtivo(d.id, d.ativo)}
                      className="btn btn-ghost"
                      style={{ fontSize: 10, padding: '4px 10px', color: d.ativo ? 'var(--red)' : 'var(--green)', borderColor: d.ativo ? 'rgba(232,100,91,0.3)' : 'rgba(61,206,140,0.3)' }}>
                      {d.ativo ? 'Bloquear' : 'Liberar'}
                    </button>
                    <button onClick={() => deletar(d.id, d.nome)}
                      style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', fontSize: 12 }}>✕</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
