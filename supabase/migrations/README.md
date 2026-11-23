# Migrações do Supabase (projeto `flowcrm`, ref `zsqsmgewvyxbtahqnigk`)

Histórico completo do schema, extraído de `supabase_migrations.schema_migrations`
em 2026-11-23. Cada arquivo é uma migração já aplicada no banco de produção,
no formato `<timestamp>_<nome>.sql` (compatível com `supabase db pull`/`db push`
da Supabase CLI, caso o projeto seja vinculado a ela no futuro).

## Segredos

Nenhum segredo real está nestes arquivos. A migração
`20261123042409_create_reporting_schema_and_looker_role.sql` cria a role
somente-leitura `looker_studio_ro` com uma senha placeholder
(`__SET_MANUALLY__`) — a senha real foi gerada e aplicada direto no banco,
fora do controle de versão. Para definir/trocar essa senha:

```sql
ALTER ROLE looker_studio_ro WITH PASSWORD '<nova-senha>';
```

## Mantendo isso atualizado

Futuras alterações de schema aplicadas via `apply_migration` (MCP) ou pelo
dashboard do Supabase não caem aqui automaticamente — precisam ser
exportadas e salvas manualmente (ou o projeto precisa ser vinculado à
Supabase CLI para `db pull` fazer isso sozinho).
