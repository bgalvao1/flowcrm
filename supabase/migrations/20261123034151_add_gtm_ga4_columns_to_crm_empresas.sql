ALTER TABLE public.crm_empresas
  ADD COLUMN IF NOT EXISTS gtm_container_id text,
  ADD COLUMN IF NOT EXISTS ga4_measurement_id text;
