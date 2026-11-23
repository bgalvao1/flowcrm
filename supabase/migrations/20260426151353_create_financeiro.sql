create table recorrencias (
  id uuid primary key default uuid_generate_v4(),
  cliente_id uuid references clientes(id) on delete cascade,
  servico text not null,
  valor numeric(10,2) not null,
  dia_vencimento integer not null check (dia_vencimento between 1 and 31),
  status text default 'ok' check (status in ('ok','vence','atraso')),
  ativo boolean default true,
  criado_em timestamptz default now()
);

create table lancamentos (
  id uuid primary key default uuid_generate_v4(),
  cliente_id uuid references clientes(id) on delete set null,
  descricao text not null,
  tipo text not null check (tipo in ('receita','despesa')),
  valor numeric(10,2) not null,
  status text default 'pendente' check (status in ('pago','pendente','atraso')),
  data_lancamento date default current_date,
  criado_em timestamptz default now()
);

alter table recorrencias enable row level security;
alter table lancamentos enable row level security;
create policy "acesso total autenticado" on recorrencias for all using (auth.role() = 'authenticated');
create policy "acesso total autenticado" on lancamentos for all using (auth.role() = 'authenticated');

