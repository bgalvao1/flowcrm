import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://zsqsmgewvyxbtahqnigk.supabase.co'
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_KEY || 'sb_publishable_mGFL6lHAVt5o1M0wYdcSEg_HoLM3D6I'

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

// ── CLIENTES ─────────────────────────────────────────────
export const clientesAPI = {
  listar: () => supabase.from('clientes').select('*').order('criado_em', { ascending: false }),
  buscar: (q) => supabase.from('clientes').select('*').or(`nome.ilike.%${q}%,status.ilike.%${q}%,segmento.ilike.%${q}%`),
  criar: (d) => supabase.from('clientes').insert(d).select().single(),
  atualizar: (id, d) => supabase.from('clientes').update({ ...d, atualizado_em: new Date().toISOString() }).eq('id', id).select().single(),
  deletar: (id) => supabase.from('clientes').delete().eq('id', id),
}

// ── PIPELINE ─────────────────────────────────────────────
export const pipelineAPI = {
  listar: () => supabase.from('deals').select('*, clientes(nome)').order('criado_em', { ascending: false }),
  criar: (d) => supabase.from('deals').insert(d).select().single(),
  moverEtapa: (id, etapa) => supabase.from('deals').update({ etapa, atualizado_em: new Date().toISOString() }).eq('id', id).select().single(),
  atualizar: (id, d) => supabase.from('deals').update({ ...d, atualizado_em: new Date().toISOString() }).eq('id', id).select().single(),
  deletar: (id) => supabase.from('deals').delete().eq('id', id),
}

// ── PROJETOS ─────────────────────────────────────────────
export const projetosAPI = {
  listar: () => supabase.from('projetos').select('*, clientes(nome, cor, iniciais), tarefas(*)').order('criado_em', { ascending: false }),
  criar: (d) => supabase.from('projetos').insert(d).select().single(),
  moverEtapa: (id, etapa) => supabase.from('projetos').update({ etapa, atualizado_em: new Date().toISOString() }).eq('id', id).select().single(),
}

export const tarefasAPI = {
  toggle: async (id, concluida, projetoId) => {
    await supabase.from('tarefas').update({ concluida }).eq('id', id)
    const { data: ts } = await supabase.from('tarefas').select('concluida').eq('projeto_id', projetoId)
    const pct = ts?.length ? Math.round(ts.filter(t => t.concluida).length / ts.length * 100) : 0
    await supabase.from('projetos').update({ progresso: pct }).eq('id', projetoId)
    return pct
  },
  criar: (projetoId, titulo) => supabase.from('tarefas').insert({ projeto_id: projetoId, titulo }).select().single(),
}

// ── FINANCEIRO ────────────────────────────────────────────
export const financeiroAPI = {
  recorrencias: () => supabase.from('recorrencias').select('*, clientes(nome, cor, iniciais)').eq('ativo', true).order('dia_vencimento'),
  lancamentos: (mes, ano) => {
    const ini = `${ano}-${String(mes).padStart(2,'0')}-01`
    const fim = `${ano}-${String(mes).padStart(2,'0')}-31`
    return supabase.from('lancamentos').select('*, clientes(nome)').gte('data_lancamento', ini).lte('data_lancamento', fim).order('data_lancamento', { ascending: false })
  },
  criarLancamento: (d) => supabase.from('lancamentos').insert(d).select().single(),
  atualizarStatus: (id, status) => supabase.from('lancamentos').update({ status }).eq('id', id),
}

// ── PROPOSTAS ─────────────────────────────────────────────
export const propostasAPI = {
  criar: (d) => supabase.from('propostas').insert(d).select().single(),
  listar: () => supabase.from('propostas').select('*, clientes(nome)').order('criado_em', { ascending: false }),
}

// ── MENSAGENS ─────────────────────────────────────────────
export const mensagensAPI = {
  listar: (clienteId) => supabase.from('mensagens').select('*').eq('cliente_id', clienteId).order('criado_em'),
  enviar: (clienteId, remetente, nome, texto) =>
    supabase.from('mensagens').insert({ cliente_id: clienteId, remetente, nome_remetente: nome, texto }).select().single(),
  assinar: (clienteId, cb) =>
    supabase.channel(`msgs:${clienteId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'mensagens', filter: `cliente_id=eq.${clienteId}` }, p => cb(p.new))
      .subscribe(),
}

// ── ENTREGAS ──────────────────────────────────────────────
export const entregasAPI = {
  porProjeto: (projetoId) => supabase.from('entregas').select('*').eq('projeto_id', projetoId).order('criado_em', { ascending: false }),
  aprovar: (id) => supabase.from('entregas').update({ status: 'aprovado', data_aprovacao: new Date().toISOString().split('T')[0] }).eq('id', id),
  revisao: (id) => supabase.from('entregas').update({ status: 'revisao' }).eq('id', id),
}

// ── AUTH ──────────────────────────────────────────────────
export const authAPI = {
  login: (email, password) => supabase.auth.signInWithPassword({ email, password }),
  logout: () => supabase.auth.signOut(),
  getSession: () => supabase.auth.getSession(),
  onAuthChange: (cb) => supabase.auth.onAuthStateChange(cb),
}
