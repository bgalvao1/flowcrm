import React from 'react'

export default function NipponflexAdmin() {
  return (
    <div>
      <div className="fade-up" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 className="page-title">Nipponflex</h1>
          <div className="page-sub">Portal autônomo para distribuidores</div>
        </div>
        <a href="/nipponflex" target="_blank" className="btn btn-primary" style={{ fontSize: 12 }}>↗ Abrir portal</a>
      </div>

      <div className="card fade-up" style={{ borderLeft: '3px solid var(--green)', display: 'flex', alignItems: 'flex-start', gap: 16, padding: 24 }}>
        <div style={{ fontSize: 36, flexShrink: 0 }}>🔒</div>
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text1)', marginBottom: 8 }}>Sistema 100% privado</div>
          <div style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.7 }}>
            Os distribuidores Nipponflex gerenciam suas informações de forma totalmente independente. Nenhum dado é visível aqui — nem nomes, nem clientes, nem qualquer outra informação.
          </div>
          <div style={{ marginTop: 16, padding: '12px 16px', background: 'var(--bg3)', borderRadius: 8, fontSize: 12, color: 'var(--text2)' }}>
            📎 Link do portal: <strong style={{ color: 'var(--accent)', userSelect: 'all' }}>flowcrm-steel.vercel.app/nipponflex</strong>
          </div>
        </div>
      </div>
    </div>
  )
}
