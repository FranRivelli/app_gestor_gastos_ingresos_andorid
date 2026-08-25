-- Pesimios Argensirios: esquema inicial
-- Correr manualmente en el SQL Editor del dashboard de Supabase (Project > SQL Editor > New query).
-- No requiere pgcrypto/uuid-ossp explícito: Supabase ya expone gen_random_uuid() por defecto.

-- ============================================================================
-- 1. Tipos enumerados
-- ============================================================================

create type tipo_movimiento as enum ('ingreso', 'gasto');
create type naturaleza_categoria as enum ('fijo', 'variable');
create type medio_pago as enum ('efectivo', 'débito', 'crédito', 'transferencia');

-- ============================================================================
-- 2. Tablas
-- ============================================================================

create table public.categorias (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  nombre text not null,
  tipo tipo_movimiento not null,
  naturaleza naturaleza_categoria not null,
  color text not null,
  activa boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.movimientos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  fecha date not null,
  tipo tipo_movimiento not null,
  categoria_id uuid not null references public.categorias(id) on delete restrict,
  monto numeric(14, 2) not null check (monto > 0),
  descripcion text,
  medio_pago medio_pago not null,
  created_at timestamptz not null default now()
);

create index movimientos_user_fecha_idx on public.movimientos (user_id, fecha desc);

create table public.presupuestos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  categoria_id uuid not null references public.categorias(id) on delete cascade,
  anio int not null,
  mes int not null check (mes between 1 and 12),
  monto_presupuestado numeric(14, 2) not null check (monto_presupuestado >= 0),
  unique (user_id, categoria_id, anio, mes)
);

-- ============================================================================
-- 3. Row Level Security: cada usuario solo ve y modifica sus propios datos
-- ============================================================================

alter table public.categorias enable row level security;
alter table public.movimientos enable row level security;
alter table public.presupuestos enable row level security;

create policy "categorias_select_own" on public.categorias
  for select using (auth.uid() = user_id);
create policy "categorias_insert_own" on public.categorias
  for insert with check (auth.uid() = user_id);
create policy "categorias_update_own" on public.categorias
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "categorias_delete_own" on public.categorias
  for delete using (auth.uid() = user_id);

create policy "movimientos_select_own" on public.movimientos
  for select using (auth.uid() = user_id);
create policy "movimientos_insert_own" on public.movimientos
  for insert with check (auth.uid() = user_id);
create policy "movimientos_update_own" on public.movimientos
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "movimientos_delete_own" on public.movimientos
  for delete using (auth.uid() = user_id);

create policy "presupuestos_select_own" on public.presupuestos
  for select using (auth.uid() = user_id);
create policy "presupuestos_insert_own" on public.presupuestos
  for insert with check (auth.uid() = user_id);
create policy "presupuestos_update_own" on public.presupuestos
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "presupuestos_delete_own" on public.presupuestos
  for delete using (auth.uid() = user_id);

-- ============================================================================
-- 4. Sembrado automático de categorías por defecto para usuarios nuevos
--
-- Se hace con un trigger SECURITY DEFINER sobre auth.users (no desde el
-- cliente) por tres motivos:
--   1. Atomicidad: la fila en auth.users y las categorías se crean en la
--      misma transacción de Postgres. No hay ventana donde el usuario exista
--      sin categorías, ni riesgo de que un cliente se cierre a mitad de camino.
--   2. RLS: las políticas de "categorias" exigen auth.uid() = user_id. Justo
--      después del signup (sobre todo con confirmación de email pendiente) el
--      cliente puede no tener todavía una sesión con JWT válido, por lo que un
--      insert desde la app podría fallar contra RLS. El trigger corre con los
--      privilegios del definer y evita ese problema por completo.
--   3. Single source of truth: el set de categorías por defecto vive en un
--      solo lugar (la base), no duplicado en el bundle de cada cliente. Si se
--      agrega una cuarta persona a la app o cambia el set, se edita acá y ya.
-- ============================================================================

create or replace function public.seed_categorias_default()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.categorias (user_id, nombre, tipo, naturaleza, color) values
    (new.id, 'Alquiler/Vivienda',        'gasto',   'fijo',     '#E0725C'),
    (new.id, 'Servicios',                'gasto',   'fijo',     '#E0885C'),
    (new.id, 'Internet y telefonía',     'gasto',   'fijo',     '#E0A05C'),
    (new.id, 'Salud',                    'gasto',   'fijo',     '#E0B85C'),
    (new.id, 'Educación',                'gasto',   'fijo',     '#D6E05C'),
    (new.id, 'Seguros',                  'gasto',   'fijo',     '#BEE05C'),
    (new.id, 'Transporte',               'gasto',   'fijo',     '#A0E05C'),
    (new.id, 'Suscripciones',            'gasto',   'fijo',     '#7EE05C'),
    (new.id, 'Supermercado',             'gasto',   'variable', '#5CE070'),
    (new.id, 'Comida fuera de casa',     'gasto',   'variable', '#5CE08A'),
    (new.id, 'Delivery',                 'gasto',   'variable', '#5CE0A6'),
    (new.id, 'Salidas y ocio',           'gasto',   'variable', '#5CE0C2'),
    (new.id, 'Ropa',                     'gasto',   'variable', '#5CC8E0'),
    (new.id, 'Regalos',                  'gasto',   'variable', '#5CA8E0'),
    (new.id, 'Mascotas',                 'gasto',   'variable', '#5C8EE0'),
    (new.id, 'Otros',                    'gasto',   'variable', '#5C72E0'),
    (new.id, 'Ahorro',                   'gasto',   'fijo',     '#6E5CE0'),
    (new.id, 'Inversiones',              'gasto',   'fijo',     '#8A5CE0'),
    (new.id, 'Fondo de emergencia',      'gasto',   'fijo',     '#A65CE0'),
    (new.id, 'Sueldo',                   'ingreso', 'fijo',     '#C25CE0'),
    (new.id, 'Freelance',                'ingreso', 'variable', '#E05CC8'),
    (new.id, 'Ventas',                   'ingreso', 'variable', '#E05CA8'),
    (new.id, 'Otros ingresos',           'ingreso', 'variable', '#E05C8A');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.seed_categorias_default();
