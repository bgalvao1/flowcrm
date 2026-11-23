create table deals (
  id uuid primary key default uuid_generate_v4(),
  cliente_id uuid references clientes(id) on delete cascade,
  nome text not null,
  empresa text,
  servico text,
  etapa text not null default 'prospeccao' check (etapa in ('prospeccao','qualificacao','proposta','fechado','perdido')),
  valor numeric(10,2) default 0,
  tag text,
  tag_label text,
  responsavel text,
  criado_em timestamptz default now(),
  atualizado_em timestamptz default now()
);

alter table deals enable row level security;
create policy "acesso total autenticado" on deals for all using (auth.role() = 'authenticated');

