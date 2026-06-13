// Event-bus de toasts — qualquer página importa { toast } e dispara feedback.
let listeners = []
let nextId = 1

export function toast(message, type = 'success') {
  const t = { id: nextId++, message, type }
  listeners.forEach(fn => fn(t))
  return t.id
}

toast.success = (m) => toast(m, 'success')
toast.error = (m) => toast(m, 'error')
toast.info = (m) => toast(m, 'info')

export function subscribeToasts(fn) {
  listeners.push(fn)
  return () => { listeners = listeners.filter(l => l !== fn) }
}
