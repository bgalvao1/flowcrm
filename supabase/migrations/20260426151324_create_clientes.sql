create extension if not exists "uuid-ossp";

create table clientes (
  id uuid primary key default uuid_generate_v4(),
  nome text not null,
  empresa text,
  segmento text,
  contato text,
  whatsapp text,
  email text,
  status text not null default 'prospect' check (status in ('ativo','prospect','qualificacao','proposta','pausado','perdido')),
  mrr numeric(10,2) default 0,
  cor text default '#4F7CFF',
  iniciais text,
  criado_em timestamptz default now(),
  atualizado_em timestamptz default now()
);

alter table clientes enable row level security;
create policy "acesso total autenticado" on clientes for all using (auth.role() = 'authenticated');

