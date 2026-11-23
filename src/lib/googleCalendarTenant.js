import { supabase } from './supabase.js'

// Sync de Google Calendar por empresa cliente (mini-CRM /acesso).
// Usa o mesmo client OAuth do Google já configurado para o CRM principal,
// mas com um redirect_uri próprio e o empresa_id viajando no "state" do OAuth.
const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID
const CLIENT_SECRET = import.meta.env.VITE_GOOGLE_CLIENT_SECRET
const REDIRECT_URI = 'https://flowcrm-steel.vercel.app/acesso'
const SCOPES = 'https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/calendar.readonly'

export function buildAuthUrl(empresaId) {
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    response_type: 'code',
    scope: SCOPES,
    access_type: 'offline',
    prompt: 'consent',
    state: empresaId,
  })
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
}

async function trocaCodePorToken(code) {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      redirect_uri: REDIRECT_URI,
      grant_type: 'authorization_code',
    }),
  })
  return res.json()
}

async function refreshToken(refresh) {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      refresh_token: refresh,
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      grant_type: 'refresh_token',
    }),
  })
  return res.json()
}

export async function handleOAuthCallback(code, empresaId) {
  const tokens = await trocaCodePorToken(code)
  if (!tokens.access_token) return { error: tokens.error_description || tokens.error || 'Falha ao conectar' }
  const expires = new Date(Date.now() + (tokens.expires_in || 3600) * 1000).toISOString()
  const { error } = await supabase.from('crm_empresas_google_calendar').upsert({
    empresa_id: empresaId,
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    expires_at: expires,
    sync_ativo: true,
    ultimo_sync: new Date().toISOString(),
  }, { onConflict: 'empresa_id' })
  if (error) return { error: error.message }
  return { ok: true }
}

export async function loadConfig(empresaId) {
  const { data } = await supabase.from('crm_empresas_google_calendar').select('*').eq('empresa_id', empresaId).maybeSingle()
  return data
}

async function getAccessToken(config) {
  const expiresAt = config.expires_at ? new Date(config.expires_at) : null
  if (expiresAt && expiresAt > new Date()) return config.access_token
  const data = await refreshToken(config.refresh_token)
  if (data.access_token) {
    const expires = new Date(Date.now() + (data.expires_in || 3600) * 1000).toISOString()
    await supabase.from('crm_empresas_google_calendar').update({ access_token: data.access_token, expires_at: expires }).eq('id', config.id)
    return data.access_token
  }
  return null
}

export async function listarEventosGoogle(config) {
  const token = await getAccessToken(config)
  if (!token) return []
  const agora = new Date().toISOString()
  const futuro = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${agora}&timeMax=${futuro}&singleEvents=true&orderBy=startTime&maxResults=20`,
    { headers: { Authorization: `Bearer ${token}` } }
  )
  const data = await res.json()
  return data.items || []
}

export async function sincronizar(config, eventosCRM) {
  const token = await getAccessToken(config)
  if (!token) return { error: 'Token inválido, reconecte' }
  let count = 0
  for (const ev of eventosCRM) {
    if (!ev.inicio) continue
    const body = {
      summary: ev.titulo,
      description: ev.descricao || '',
      start: { dateTime: ev.inicio, timeZone: 'America/Sao_Paulo' },
      end: { dateTime: ev.fim || new Date(new Date(ev.inicio).getTime() + 3600000).toISOString(), timeZone: 'America/Sao_Paulo' },
    }
    await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    count++
    await new Promise(r => setTimeout(r, 200))
  }
  await supabase.from('crm_empresas_google_calendar').update({ ultimo_sync: new Date().toISOString() }).eq('id', config.id)
  return { count }
}

export async function desconectar(configId) {
  await supabase.from('crm_empresas_google_calendar').update({ access_token: null, refresh_token: null, sync_ativo: false }).eq('id', configId)
}
