alter table clientes
  add column if not exists instagram text,
  add column if not exists google_maps text,
  add column if not exists website text,
  add column if not exists social_media text,
  add column if not exists meta_ads text default 'Sem Ads',
  add column if not exists google_ads text default 'Sem Ads',
  add column if not exists nicho text,
  add column if not exists cidade text,
  add column if not exists estado text,
  add column if not exists icp integer default 0 check (icp between 0 and 5),
  add column if not exists status_comercial text default 'Novo Lead'
    check (status_comercial in (
      'Novo Lead','Em Negociação','Reunião Realizada',
      'Proposta Enviada','Contrato Fechado','Perdido'
    )),
  add column if not exists observacoes text;

