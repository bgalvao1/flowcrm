-- ETAPA 2: Isolamento multi-tenant do SaaS com Supabase Auth + RLS
DO $$
DECLARE
  emp RECORD;
  novo_id uuid;
BEGIN
  FOR emp IN SELECT id, email, senha, nome FROM public.crm_empresas
             WHERE email IS NOT NULL
               AND NOT EXISTS (SELECT 1 FROM auth.users u WHERE u.email ILIKE crm_empresas.email)
  LOOP
    novo_id := gen_random_uuid();
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, recovery_token, email_change, email_change_token_new, email_change_token_current
    ) VALUES (
      '00000000-0000-0000-0000-000000000000', novo_id, 'authenticated', 'authenticated',
      lower(emp.email), crypt(coalesce(emp.senha, gen_random_uuid()::text), gen_salt('bf')), now(),
      jsonb_build_object('provider','email','providers', jsonb_build_array('email'), 'empresa_id', emp.id, 'tenant','saas'),
      jsonb_build_object('nome', emp.nome),
      now(), now(), '', '', '', '', ''
    );
    INSERT INTO auth.identities (
      id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at
    ) VALUES (
      gen_random_uuid(), novo_id, novo_id::text, 'email',
      jsonb_build_object('sub', novo_id::text, 'email', lower(emp.email), 'email_verified', true),
      now(), now(), now()
    );
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.empresa_id_atual()
RETURNS uuid
LANGUAGE sql STABLE
AS $$
  SELECT nullif(((auth.jwt() -> 'app_metadata') ->> 'empresa_id'), '')::uuid;
$$;

ALTER TABLE public.crm_empresas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_leads    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_tarefas  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_eventos  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saas_pagamentos ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE pol RECORD;
BEGIN
  FOR pol IN SELECT policyname, tablename FROM pg_policies
             WHERE schemaname='public'
               AND tablename IN ('crm_empresas','crm_leads','crm_tarefas','crm_eventos','saas_pagamentos')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, pol.tablename);
  END LOOP;
END $$;

CREATE POLICY empresa_proprio_cadastro ON public.crm_empresas
  FOR SELECT TO authenticated
  USING (id = public.empresa_id_atual());

CREATE POLICY empresa_atualiza_cadastro ON public.crm_empresas
  FOR UPDATE TO authenticated
  USING (id = public.empresa_id_atual())
  WITH CHECK (id = public.empresa_id_atual());

CREATE POLICY isolamento_leads ON public.crm_leads
  FOR ALL TO authenticated
  USING (empresa_id = public.empresa_id_atual())
  WITH CHECK (empresa_id = public.empresa_id_atual());

CREATE POLICY isolamento_tarefas ON public.crm_tarefas
  FOR ALL TO authenticated
  USING (empresa_id = public.empresa_id_atual())
  WITH CHECK (empresa_id = public.empresa_id_atual());

CREATE POLICY isolamento_eventos ON public.crm_eventos
  FOR ALL TO authenticated
  USING (empresa_id = public.empresa_id_atual())
  WITH CHECK (empresa_id = public.empresa_id_atual());

CREATE POLICY empresa_ve_pagamentos ON public.saas_pagamentos
  FOR SELECT TO authenticated
  USING (cliente_id = public.empresa_id_atual());

CREATE OR REPLACE FUNCTION public.admin_listar_empresas_saas()
RETURNS TABLE (id uuid, nome text, email text, plano text, valor numeric, status text, vencimento date, criado_em timestamptz)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF (auth.jwt() ->> 'email') NOT ILIKE 'bgalvao1@gmail.com' THEN
    RAISE EXCEPTION 'Acesso restrito ao administrador';
  END IF;
  RETURN QUERY
    SELECT e.id, e.nome, e.email, e.plano, e.valor, e.status, e.vencimento, e.criado_em
    FROM public.crm_empresas e;
END;
$$;
REVOKE ALL ON FUNCTION public.admin_listar_empresas_saas() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.admin_listar_empresas_saas() TO authenticated;

-- Elimina senhas em texto puro (coluna passa a aceitar NULL; senha agora vive só no Auth, criptografada)
ALTER TABLE public.crm_empresas ALTER COLUMN senha DROP NOT NULL;
UPDATE public.crm_empresas SET senha = NULL;

REVOKE ALL ON public.crm_empresas, public.crm_leads, public.crm_tarefas, public.crm_eventos, public.saas_pagamentos FROM anon;
