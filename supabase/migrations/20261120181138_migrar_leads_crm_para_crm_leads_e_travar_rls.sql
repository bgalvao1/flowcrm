insert into public.crm_leads (id, empresa_id, nome, empresa, whatsapp, email, cargo, servico, valor, etapa, temperatura, ultimo_contato, proximo_followup, observacao, criado_em, atualizado_em)
select id, empresa_id, nome, empresa, whatsapp, email, cargo, servico, valor, etapa, temperatura, ultimo_contato, proximo_followup, observacao, criado_em, atualizado_em
from public.leads_crm
on conflict (id) do nothing;

alter table public.leads_crm enable row level security;
