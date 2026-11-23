alter table clientes
  add column if not exists cnpj text,
  add column if not exists canal_vendas text;

