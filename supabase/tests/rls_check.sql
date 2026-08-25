-- Verificación de RLS para Pesimios Argensirios
-- Correr en el SQL Editor del dashboard de Supabase después de aplicar
-- supabase/migrations/001_schema.sql.
--
-- Para cada una de las tres tablas comprueba:
--   1. Que Row Level Security esté habilitado (rowsecurity = true).
--   2. Que existan políticas para SELECT, INSERT, UPDATE y DELETE.
--
-- La columna "estado" dice OK si todo está bien, o el detalle de qué falta.
-- Si una tabla no existe todavía, "estado" lo indica en vez de reportar
-- falsos "RLS deshabilitado" / "política faltante".

with tablas_esperadas as (
  select unnest(array['categorias', 'movimientos', 'presupuestos']) as tabla
),
tablas_existentes as (
  select tablename, rowsecurity
  from pg_tables
  where schemaname = 'public'
),
politicas as (
  select tablename, cmd, count(*) as cantidad
  from pg_policies
  where schemaname = 'public'
  group by tablename, cmd
),
resumen as (
  select
    t.tabla,
    (e.tablename is not null) as existe,
    coalesce(e.rowsecurity, false) as rls_habilitado,
    coalesce((select cantidad from politicas p where p.tablename = t.tabla and p.cmd = 'SELECT'), 0) > 0 as policy_select,
    coalesce((select cantidad from politicas p where p.tablename = t.tabla and p.cmd = 'INSERT'), 0) > 0 as policy_insert,
    coalesce((select cantidad from politicas p where p.tablename = t.tabla and p.cmd = 'UPDATE'), 0) > 0 as policy_update,
    coalesce((select cantidad from politicas p where p.tablename = t.tabla and p.cmd = 'DELETE'), 0) > 0 as policy_delete
  from tablas_esperadas t
  left join tablas_existentes e on e.tablename = t.tabla
)
select
  tabla,
  existe,
  rls_habilitado,
  policy_select,
  policy_insert,
  policy_update,
  policy_delete,
  case
    when not existe then 'FALTA: la tabla no existe (¿corriste 001_schema.sql?)'
    when rls_habilitado and policy_select and policy_insert and policy_update and policy_delete
      then 'OK'
    else 'FALTA: ' || array_to_string(
      array_remove(array[
        case when not rls_habilitado then 'RLS deshabilitado' end,
        case when not policy_select then 'política SELECT' end,
        case when not policy_insert then 'política INSERT' end,
        case when not policy_update then 'política UPDATE' end,
        case when not policy_delete then 'política DELETE' end
      ], null),
      ', '
    )
  end as estado
from resumen
order by tabla;
