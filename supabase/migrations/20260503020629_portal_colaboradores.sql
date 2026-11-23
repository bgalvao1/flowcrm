-- Adicionar campo de acesso ao portal nos colaboradores
alter table colaboradores
  add column if not exists portal_email text,
  add column if not exists portal_senha_hash text,
  add column if not exists tipo text default 'colaborador'
    check (tipo in ('colaborador','cliente'));

-- Tabela de projetos vinculados a colaboradores
create table if not exists colaborador_projetos (
  id uuid primary key default uuid_generate_v4(),
  colaborador_id uuid references colaboradores(id) on delete cascade,
  projeto_id uuid references projetos(id) on delete cascade,
  criado_em timestamptz default now(),
  unique(colaborador_id, projeto_id)
);

alter table colaborador_projetos enable row level security;
create policy "acesso total autenticado" on colaborador_projetos
  for all using (auth.role() = 'authenticated');

-- Atualizar Julyanne Lima com e-mail do portal
update colaboradores
set portal_email = 'julyanne@flowagency.com.br'
where nome = 'Julyanne Lima';

