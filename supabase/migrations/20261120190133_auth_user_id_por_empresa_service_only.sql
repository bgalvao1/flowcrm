create or replace function public.auth_user_id_por_empresa(p_empresa uuid, p_email text)
returns uuid
language sql
security definer
set search_path = ''
as $$
  select u.id
  from auth.users u
  where lower(u.email) = lower(p_email)
    and u.raw_app_meta_data ->> 'empresa_id' = p_empresa::text
  limit 1
$$;

revoke all on function public.auth_user_id_por_empresa(uuid, text) from public, anon, authenticated;
grant execute on function public.auth_user_id_por_empresa(uuid, text) to service_role;
