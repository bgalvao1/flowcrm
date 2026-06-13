import React, { useEffect, useRef, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'

const PAGES = [
  { label: 'Dashboard', path: '/', hint: 'Página' },
  { label: 'Pipeline de Vendas', path: '/pipeline', hint: 'Página' },
  { label: 'Clientes', path: '/clientes', hint: 'Página' },
  { label: 'Projetos', path: '/projetos', hint: 'Página' },
  { label: 'Financeiro', path: '/financeiro', hint: 'Página' },
  { label: 'Gerar Proposta', path: '/proposta', hint: 'Página' },
  { label: 'Agenda', path: '/agenda', hint: 'Página' },
  { label: 'Tarefas', path: '/tarefas', hint: 'Página' },
  { label: 'Central de Gestão', path: '/gestao', hint: 'Página' },
  { label: 'Dados & LGPD', path: '/dados', hint: 'Página' },
]

const norm = (s) => (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')

export default function CommandPalette({ open, onClose }) {
  const [query, setQuery] = useState('')
  const [clientes, setClientes] = useState([])
  const [projetos, setProjetos] = useState([])
  const [selected, setSelected] = useState(0)
  const [loaded, setLoaded] = useState(false)
  const inputRef = useRef(null)
  const navigate = useNavigate()

  // Carrega dados na primeira abertura
  useEffect(() => {
    if (open && !loaded) {
      Promise.all([
        supabase.from('clientes').select('id, nome, status').limit(300),
        supabase.from('projetos').select('id, nome, etapa').limit(300),
      ]).then(([c, p]) => {
        setClientes(c.data || [])
        setProjetos(p.data || [])
        setLoaded(true)
      })
    }
    if (open) {
      setQuery('')
      setSelected(0)
      setTimeout(() => inputRef.current?.focus(), 30)
    }
  }, [open])

  const results = useMemo(() => {
    const q = norm(query)
    const match = (txt) => !q || norm(txt).includes(q)
    const pages = PAGES.filter(p => match(p.label)).map(p => ({ ...p, group: 'Navegação' }))
    const cls = (q ? clientes.filter(c => match(c.nome)) : clientes.slice(0, 4))
      .slice(0, 6).map(c => ({ label: c.nome, path: '/clientes', hint: c.status || 'Cliente', group: 'Clientes' }))
    const prj = (q ? projetos.filter(p => match(p.nome)) : projetos.slice(0, 3))
      .slice(0, 5).map(p => ({ label: p.nome, path: '/projetos', hint: p.etapa || 'Projeto', group: 'Projetos' }))
    return [...pages, ...cls, ...prj]
  }, [query, clientes, projetos])

  useEffect(() => { setSelected(0) }, [query])

  function go(item) {
    if (!item) return
    navigate(item.path)
    onClose()
  }

  function onKeyDown(e) {
    if (e.key === 'ArrowDown') { e.preventDefault(); setSelected(s => Math.min(s + 1, results.length - 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setSelected(s => Math.max(s - 1, 0)) }
    else if (e.key === 'Enter') { e.preventDefault(); go(results[selected]) }
    else if (e.key === 'Escape') { onClose() }
  }

  if (!open) return null

  let lastGroup = null

  return (
    <div className="cmdk-overlay" onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="cmdk">
        <input
          ref={inputRef}
          className="cmdk-input"
          placeholder="Buscar páginas, clientes, projetos..."
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={onKeyDown}
        />
        <div className="cmdk-list">
          {results.length === 0 && <div className="cmdk-empty">Nada encontrado para “{query}”</div>}
          {results.map((item, i) => {
            const showGroup = item.group !== lastGroup
            lastGroup = item.group
            return (
              <React.Fragment key={`${item.group}-${item.label}-${i}`}>
                {showGroup && <div className="cmdk-group eyebrow">{item.group}</div>}
                <div
                  className={`cmdk-item${i === selected ? ' selected' : ''}`}
                  onMouseEnter={() => setSelected(i)}
                  onClick={() => go(item)}
                >
                  <span>{item.label}</span>
                  <span className="cmdk-meta">{item.hint}</span>
                </div>
              </React.Fragment>
            )
          })}
        </div>
      </div>
    </div>
  )
}
