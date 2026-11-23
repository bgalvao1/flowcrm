-- helper reutilizável de admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean LANGUAGE sql STABLE AS $$
  SELECT (auth.jwt() ->> 'email') ILIKE 'bgalvao1@gmail.com';
$$;

-- admin enxerga todas as empresas
CREATE POLICY admin_select_empresas ON public.crm_empresas
  FOR SELECT TO authenticated USING (public.is_admin());

-- admin cadastra empresa nova
CREATE POLICY admin_insert_empresas ON public.crm_empresas
  FOR INSERT TO authenticated WITH CHECK (public.is_admin());

-- admin atualiza qualquer empresa (billing, status, vencimento)
CREATE POLICY admin_update_empresas ON public.crm_empresas
  FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
