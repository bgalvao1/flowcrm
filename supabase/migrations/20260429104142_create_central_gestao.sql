-- Colaboradores
create table colaboradores (
  id uuid primary key default uuid_generate_v4(),
  nome text not null,
  email text,
  cargo text,
  avatar_iniciais text,
  avatar_cor text default '#4F7CFF',
  ativo boolean default true,
  criado_em timestamptz default now()
);

-- Metas
create table metas (
  id uuid primary key default uuid_generate_v4(),
  titulo text not null,
  descricao text,
  tipo text default 'Comercial' check (tipo in ('Comercial','Operacional','Financeiro','Marketing','Outro')),
  valor_meta numeric(12,2) default 0,
  valor_atual numeric(12,2) default 0,
  unidade text default 'R$',
  data_inicio date default current_date,
  data_fim date,
  status text default 'ativa' check (status in ('ativa','concluida','cancelada')),
  colaborador_id uuid references colaboradores(id) on delete set null,
  criado_em timestamptz default now()
);

-- Alertas de projetos / acompanhamento
create table alertas (
  id uuid primary key default uuid_generate_v4(),
  titulo text not null,
  tipo text default 'info' check (tipo in ('info','aviso','urgente','sucesso')),
  descricao text,
  resolvido boolean default false,
  colaborador_id uuid references colaboradores(id) on delete set null,
  cliente_id uuid references clientes(id) on delete set null,
  criado_em timestamptz default now()
);

-- RLS
alter table colaboradores enable row level security;
alter table metas enable row level security;
alter table alertas enable row level security;

create policy "acesso total autenticado" on colaboradores for all using (auth.role() = 'authenticated');
create policy "acesso total autenticado" on metas for all using (auth.role() = 'authenticated');
create policy "acesso total autenticado" on alertas for all using (auth.role() = 'authenticated');

-- Inserir Bruno Galvão como colaborador padrão
insert into colaboradores (nome, email, cargo, avatar_iniciais, avatar_cor)
values ('Bruno Galvão', 'bgalvao1@gmail.com', 'Administrador', 'BG', '#4F7CFF');

