create table tarefas_agenda (
  id uuid primary key default uuid_generate_v4(),
  titulo text not null,
  descricao text,
  backlog boolean default false,
  data date,
  horario time,
  prioridade text default 'Media'
    check (prioridade in ('Baixa','Media','Alta','Urgente')),
  repetir text default 'Nao repete'
    check (repetir in ('Nao repete','Todo dia','Toda semana','Todo mes')),
  cliente_id uuid references clientes(id) on delete set null,
  concluida boolean default false,
  criado_em timestamptz default now()
);

alter table tarefas_agenda enable row level security;
create policy "acesso total autenticado" on tarefas_agenda
  for all using (auth.role() = 'authenticated');

create index idx_tarefas_agenda_data on tarefas_agenda(data);
create index idx_tarefas_agenda_cliente on tarefas_agenda(cliente_id);

