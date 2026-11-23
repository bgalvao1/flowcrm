-- Cliente (tenant) podia alterar status/vencimento/plano/valor da própria empresa. Só o admin deve alterar.
drop policy if exists empresa_atualiza_cadastro on public.crm_empresas;
