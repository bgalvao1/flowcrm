CREATE SCHEMA IF NOT EXISTS reporting;

CREATE VIEW reporting.mrr_mensal AS
SELECT ano, mes, valor AS mrr
FROM public.mrr_historico
ORDER BY ano, mes;

CREATE VIEW reporting.deals_pipeline AS
SELECT etapa, count(*) AS qtd, coalesce(sum(valor),0) AS valor_total
FROM public.deals
GROUP BY etapa;

CREATE VIEW reporting.clientes_status AS
SELECT status, count(*) AS qtd, coalesce(sum(mrr),0) AS mrr_total
FROM public.clientes
GROUP BY status;

CREATE VIEW reporting.crm_empresas_resumo AS
SELECT
  e.id AS empresa_id,
  e.nome AS empresa_nome,
  e.plano,
  e.valor,
  e.status,
  e.vencimento,
  (SELECT count(*) FROM public.crm_leads l WHERE l.empresa_id = e.id) AS total_leads,
  (SELECT count(*) FROM public.crm_leads l WHERE l.empresa_id = e.id AND l.etapa = 'fechado') AS leads_fechados
FROM public.crm_empresas e;

CREATE VIEW reporting.crm_leads_pipeline AS
SELECT
  ce.nome AS empresa_nome,
  cl.etapa,
  count(*) AS qtd,
  coalesce(sum(cl.valor),0) AS valor_total
FROM public.crm_leads cl
JOIN public.crm_empresas ce ON ce.id = cl.empresa_id
GROUP BY ce.nome, cl.etapa;

CREATE VIEW reporting.crm_tarefas_resumo AS
SELECT
  ce.nome AS empresa_nome,
  t.prioridade,
  t.concluida,
  count(*) AS qtd
FROM public.crm_tarefas t
JOIN public.crm_empresas ce ON ce.id = t.empresa_id
GROUP BY ce.nome, t.prioridade, t.concluida;

CREATE VIEW reporting.saas_pagamentos_mensal AS
SELECT mes_referencia, count(*) AS qtd, coalesce(sum(valor),0) AS valor_total
FROM public.saas_pagamentos
GROUP BY mes_referencia;

CREATE VIEW reporting.visao_geral AS
SELECT
  (SELECT count(*) FROM public.crm_empresas WHERE status = 'ativo') AS empresas_ativas,
  (SELECT coalesce(sum(valor),0) FROM public.crm_empresas WHERE status = 'ativo') AS mrr_mini_crm,
  (SELECT count(*) FROM public.clientes WHERE status = 'ativo') AS clientes_ativos_crm_principal,
  (SELECT coalesce(sum(mrr),0) FROM public.clientes WHERE status = 'ativo') AS mrr_crm_principal,
  (SELECT count(*) FROM public.crm_leads WHERE etapa NOT IN ('fechado','perdido')) AS leads_em_andamento,
  (SELECT count(*) FROM public.deals) AS deals_total;

-- SEGREDO REDIGIDO: a senha real foi definida fora do controle de versão
-- (gerada e aplicada diretamente no banco). Para recriar/trocar a senha,
-- rode manualmente: ALTER ROLE looker_studio_ro WITH PASSWORD '<nova-senha>';
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'looker_studio_ro') THEN
    CREATE ROLE looker_studio_ro WITH LOGIN PASSWORD '__SET_MANUALLY__' NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT;
  END IF;
END
$$;

GRANT CONNECT ON DATABASE postgres TO looker_studio_ro;
GRANT USAGE ON SCHEMA reporting TO looker_studio_ro;
GRANT SELECT ON ALL TABLES IN SCHEMA reporting TO looker_studio_ro;
ALTER DEFAULT PRIVILEGES IN SCHEMA reporting GRANT SELECT ON TABLES TO looker_studio_ro;
