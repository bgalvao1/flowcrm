create table projetos (
  id uuid primary key default uuid_generate_v4(),
  cliente_id uuid references clientes(id) on delete cascade,
  nome text not null,
  servico text,
  etapa text not null default 'backlog' check (etapa in ('backlog','andamento','revisao','concluido')),
  progresso integer default 0,
  responsavel text,
  responsavel2 text,
  prazo date,
  prazo_status text default 'ok' check (prazo_status in ('ok','soon','late')),
  tag text,
  tag_label text,
  criado_em timestamptz default now(),
  atualizado_em timestamptz default now()
);

create table tarefas (
  id uuid primary key default uuid_generate_v4(),
  projeto_id uuid references projetos(id) on delete cascade,
  titulo text not null,
  concluida boolean default false,
  ordem integer default 0,
  criado_em timestamptz default now()
);

alter table projetos enable row level security;
alter table tarefas enable row level security;
create policy "acesso total autenticado" on projetos for all using (auth.role() = 'authenticated');
create policy "acesso total autenticado" on tarefas for all using (auth.role() = 'authenticated');

