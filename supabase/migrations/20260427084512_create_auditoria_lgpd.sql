-- Tabela de auditoria para conformidade LGPD
create table auditoria_exportacoes (
  id uuid primary key default uuid_generate_v4(),
  usuario_email text not null,
  tipo_exportacao text not null check (tipo_exportacao in ('csv','pdf','importacao')),
  registros_afetados integer not null default 0,
  finalidade text not null,
  ip_origem text,
  dados_exportados jsonb, -- quais campos foram exportados
  criado_em timestamptz default now()
);

alter table auditoria_exportacoes enable row level security;
create policy "acesso total autenticado" on auditoria_exportacoes
  for all using (auth.role() = 'authenticated');

-- Index para consultas de auditoria
create index idx_auditoria_usuario on auditoria_exportacoes(usuario_email);
create index idx_auditoria_data on auditoria_exportacoes(criado_em);

