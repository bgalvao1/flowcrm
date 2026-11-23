create table entregas (
  id uuid primary key default uuid_generate_v4(),
  projeto_id uuid references projetos(id) on delete cascade,
  titulo text not null,
  descricao text,
  status text default 'pendente' check (status in ('pendente','aprovado','revisao')),
  data_envio date default current_date,
  data_aprovacao date,
  criado_em timestamptz default now()
);

alter table entregas enable row level security;
create policy "acesso total autenticado" on entregas for all using (auth.role() = 'authenticated');

insert into clientes (nome, empresa, segmento, contato, status, mrr, cor, iniciais) values
  ('Clínica Vitalle', 'Clínica Vitalle', 'Saúde', 'Dr. Carlos Lima', 'ativo', 4800, '#4F7CFF', 'CV'),
  ('Hotel Paraíso', 'Hotel Paraíso', 'Turismo', 'Ana Mello', 'ativo', 8500, '#F5A623', 'HP'),
  ('Odonto Plus', 'Odonto Plus', 'Odontologia', 'Dr. Roberto', 'ativo', 2200, '#7B5CFF', 'OP'),
  ('Distribuidora Max', 'Distribuidora Max', 'B2B', 'Marcos Vini', 'proposta', 12000, '#FF5B5B', 'DM'),
  ('Escola Criativa', 'Escola Criativa', 'Educação', 'Fernanda', 'qualificacao', 3800, '#4F7CFF', 'EC'),
  ('Loja Bella Moda', 'Loja Bella Moda', 'Varejo', 'Patricia', 'pausado', 1500, '#22C97A', 'LB');

