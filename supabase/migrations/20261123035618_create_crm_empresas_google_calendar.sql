CREATE TABLE public.crm_empresas_google_calendar (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL UNIQUE REFERENCES public.crm_empresas(id) ON DELETE CASCADE,
  access_token text,
  refresh_token text,
  expires_at timestamptz,
  sync_ativo boolean DEFAULT false,
  ultimo_sync timestamptz,
  criado_em timestamptz DEFAULT now()
);

ALTER TABLE public.crm_empresas_google_calendar ENABLE ROW LEVEL SECURITY;

CREATE POLICY isolamento_google_calendar ON public.crm_empresas_google_calendar
  FOR ALL
  USING (empresa_id = empresa_id_atual())
  WITH CHECK (empresa_id = empresa_id_atual());
