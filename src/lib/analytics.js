// Injeta GTM/GA4 por empresa (cada cliente do CRM usa seu próprio container).
let gtmId = null
let ga4Id = null

export function initGTM(containerId) {
  if (!containerId || containerId === gtmId) return
  gtmId = containerId
  window.dataLayer = window.dataLayer || []
  window.dataLayer.push({ 'gtm.start': Date.now(), event: 'gtm.js' })
  const script = document.createElement('script')
  script.async = true
  script.src = `https://www.googletagmanager.com/gtm.js?id=${containerId}`
  document.head.appendChild(script)
}

export function initGA4(measurementId) {
  if (!measurementId || measurementId === ga4Id) return
  ga4Id = measurementId
  window.dataLayer = window.dataLayer || []
  window.gtag = window.gtag || function (...args) { window.dataLayer.push(args) }
  const script = document.createElement('script')
  script.async = true
  script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`
  document.head.appendChild(script)
  window.gtag('js', new Date())
  window.gtag('config', measurementId)
}

export function trackEvent(name, params = {}) {
  window.dataLayer = window.dataLayer || []
  window.dataLayer.push({ event: name, ...params })
  if (typeof window.gtag === 'function') window.gtag('event', name, params)
}
