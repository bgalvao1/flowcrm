create table eventos (
  id uuid primary key default uuid_generate_v4(),
  titulo text not null,
  tipo text not null default 'Reunião Online'
    check (tipo in ('Reunião Online','Reunião Presencial','Ligação','Follow-up','Apresentação','Outro')),
  data date not null,
  horario time not null,
  cliente_id uuid references clientes(id) on delete set null,
  participantes text[],
  descricao text,
  status text default 'agendado'
    check (status in ('agendado','realizado','cancelado')),
  criado_em timestamptz default now()
);

alter table eventos enable row level security;
create policy "acesso total autenticado" on eventos
  for all using (auth.role() = 'authenticated');

create index idx_eventos_data on eventos(data);
create index idx_eventos_cliente on eventos(cliente_id);

