create table propostas (
  id uuid primary key default uuid_generate_v4(),
  cliente_id uuid references clientes(id) on delete set null,
  cliente_nome text not null,
  segmento text,
  servicos text[],
  modelo_cobranca text,
  prazo_entrega text,
  valor_projeto numeric(10,2) default 0,
  mensalidade numeric(10,2) default 0,
  validade text,
  conteudo text,
  criado_em timestamptz default now()
);

create table mensagens (
  id uuid primary key default uuid_generate_v4(),
  cliente_id uuid references clientes(id) on delete cascade,
  remetente text not null check (remetente in ('agencia','cliente')),
  nome_remetente text,
  texto text not null,
  lida boolean default false,
  criado_em timestamptz default now()
);

alter table propostas enable row level security;
alter table mensagens enable row level security;
create policy "acesso total autenticado" on propostas for all using (auth.role() = 'authenticated');
create policy "acesso total autenticado" on mensagens for all using (auth.role() = 'authenticated');

create policy "cliente ve suas mensagens" on mensagens for select
  using (auth.uid()::text = cliente_id::text or auth.role() = 'authenticated');

