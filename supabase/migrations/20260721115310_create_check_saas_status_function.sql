CREATE OR REPLACE FUNCTION check_saas_status(p_cliente_id uuid)
RETURNS TABLE (
  saas_ativo boolean,
  saas_status text,
  saas_proximo_vencimento date
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT c.saas_ativo, c.saas_status, c.saas_proximo_vencimento
  FROM clientes c
  WHERE c.id = p_cliente_id;
END;
$$;

GRANT EXECUTE ON FUNCTION check_saas_status(uuid) TO anon, authenticated;
