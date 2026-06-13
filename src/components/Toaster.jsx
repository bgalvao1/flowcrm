import React, { useEffect, useState } from 'react'
import { subscribeToasts } from '../lib/toast.js'

const ICONS = { success: '✓', error: '✕', info: '◆' }

export default function Toaster() {
  const [toasts, setToasts] = useState([])

  useEffect(() => {
    const unsub = subscribeToasts(t => {
      setToasts(prev => [...prev, t])
      setTimeout(() => dismiss(t.id), 3500)
    })
    return unsub
  }, [])

  function dismiss(id) {
    setToasts(prev => prev.map(t => t.id === id ? { ...t, leaving: true } : t))
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 220)
  }

  return (
    <div className="toaster">
      {toasts.map(t => (
        <div key={t.id} className={`toast toast-${t.type}${t.leaving ? ' leaving' : ''}`} onClick={() => dismiss(t.id)}>
          <span className="toast-icon" style={{ color: t.type === 'success' ? 'var(--green)' : t.type === 'error' ? 'var(--red)' : 'var(--sky)' }}>
            {ICONS[t.type] || '◆'}
          </span>
          <span style={{ flex: 1 }}>{t.message}</span>
        </div>
      ))}
    </div>
  )
}
