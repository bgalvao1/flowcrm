alter table lancamentos
  add column if not exists ano integer default extract(year from current_date)::integer,
  add column if not exists mes integer default extract(month from current_date)::integer,
  add column if not exists categoria text,
  add column if not exists subcategoria text,
  add column if not exists data_vencimento date,
  add column if not exists pago boolean default false;

-- Índices para consultas por ano/mês
create index if not exists idx_lancamentos_ano_mes on lancamentos(ano, mes);
create index if not exists idx_lancamentos_tipo on lancamentos(tipo);
create index if not exists idx_lancamentos_pago on lancamentos(pago);

