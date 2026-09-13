-- Pesimios Argensirios: importación de resúmenes de Mercado Pago (Fase 6)
-- Correr manualmente en el SQL Editor del dashboard de Supabase, o via
-- `npx supabase db push` (la CLI ya está vinculada al proyecto).

-- ============================================================================
-- 1. movimientos.id_externo: identifica un movimiento importado (ID de
--    operación de Mercado Pago) para poder reconocerlo en una reimportación
--    y no duplicarlo. Nullable porque los movimientos cargados a mano no
--    tienen ID externo. Único por usuario, no global: las 3 cuentas son
--    completamente independientes y un mismo ID de operación de MP nunca va
--    a repetirse dentro de la cuenta de una sola persona, pero sí podría
--    coincidir por casualidad entre cuentas distintas si no se aisla por
--    user_id.
-- ============================================================================

alter table public.movimientos
  add column id_externo text;

-- Postgres no considera duplicados dos NULL en un unique constraint, así que
-- los movimientos cargados a mano (id_externo null) nunca chocan entre sí.
alter table public.movimientos
  add constraint movimientos_user_id_externo_key unique (user_id, id_externo);

-- ============================================================================
-- 2. Reglas de categorización: se crean desde la previsualización de
--    importación ("recordar esta categoría para las filas que digan
--    'Carrefour'") y se usan para sugerir categoría en la próxima
--    importación. El matcheo de patrón contra la descripción del movimiento
--    se hace en la app (substring case-insensitive), no acá: son pocas
--    reglas por usuario y evita tener que mantener lógica de matching
--    también en SQL.
-- ============================================================================

create table public.reglas_categorizacion (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  patron text not null,
  categoria_id uuid not null references public.categorias(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, patron)
);

alter table public.reglas_categorizacion enable row level security;

create policy "reglas_categorizacion_select_own" on public.reglas_categorizacion
  for select using (auth.uid() = user_id);
create policy "reglas_categorizacion_insert_own" on public.reglas_categorizacion
  for insert with check (auth.uid() = user_id);
create policy "reglas_categorizacion_update_own" on public.reglas_categorizacion
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "reglas_categorizacion_delete_own" on public.reglas_categorizacion
  for delete using (auth.uid() = user_id);
