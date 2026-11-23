CREATE OR REPLACE FUNCTION liberar_saas_por_confianca(
  p_cliente_id uuid,
  p_dias integer DEFAULT 30,
  p_confirmado_por text DEFAULT 'Bruno'
)
RETURNS TABLE (
  id uuid,
  nome text,
  saas_ativo boolean,
  saas_status text,
  saas_ultimo_pagamento date,
  saas_proximo_vencimento date
)
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE clientes
  SET saas_ativo = true,
      saas_status = 'ativo',
      saas_ultimo_pagamento = CURRENT_DATE,
      saas_proximo_vencimento = CURRENT_DATE + (p_dias || ' days')::interval,
      atualizado_em = now()
  WHERE clientes.id = p_cliente_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Cliente com id % não encontrado', p_cliente_id;
  END IF;

  INSERT INTO saas_pagamentos (cliente_id, valor, data_pagamento, mes_referencia, confirmado_por, observacao, criado_em)
  VALUES (
    p_cliente_id,
    0,
    CURRENT_DATE,
    to_char(CURRENT_DATE, 'YYYY-MM'),
    p_confirmado_por,
    'Liberado por confiança (sem comprovante no momento da liberação)',
    now()
  );

  RETURN QUERY
  SELECT clientes.id, clientes.nome, clientes.saas_ativo, clientes.saas_status,
         clientes.saas_ultimo_pagamento, clientes.saas_proximo_vencimento
  FROM clientes
  WHERE clientes.id = p_cliente_id;
END;
$$;
