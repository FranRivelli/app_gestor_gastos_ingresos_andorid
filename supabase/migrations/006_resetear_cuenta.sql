-- Pesimios Argensirios: resetear cuenta (Fase 6)
-- Correr manualmente en el SQL Editor del dashboard de Supabase, o via
-- `npx supabase db push`.
--
-- Necesita poder "restaurar las categorías por defecto" para una cuenta que
-- YA existe, no solo para una recién creada (eso ya lo cubre el trigger
-- on_auth_user_created). En vez de duplicar la lista de 23 categorías acá
-- también, se la saca del cuerpo del trigger y se la deja en una función
-- de tabla (categorias_default()) que ambos casos reusan — se mantiene una
-- sola fuente de verdad, como ya se documentó para el sembrado original.

-- ============================================================================
-- 1. categorias_default(): la lista de 23 categorías, ahora reusable.
-- ============================================================================

create or replace function public.categorias_default()
returns table (nombre text, tipo tipo_movimiento, naturaleza naturaleza_categoria, color text)
language sql
immutable
as $$
  values
    ('Alquiler/Vivienda',        'gasto'::tipo_movimiento,   'fijo'::naturaleza_categoria,     '#D22D2D'),
    ('Servicios',                'gasto'::tipo_movimiento,   'fijo'::naturaleza_categoria,     '#20DF20'),
    ('Internet y telefonía',     'gasto'::tipo_movimiento,   'fijo'::naturaleza_categoria,     '#2020DF'),
    ('Salud',                    'gasto'::tipo_movimiento,   'fijo'::naturaleza_categoria,     '#20B9DF'),
    ('Educación',                'gasto'::tipo_movimiento,   'fijo'::naturaleza_categoria,     '#EDD882'),
    ('Seguros',                  'gasto'::tipo_movimiento,   'fijo'::naturaleza_categoria,     '#E481DA'),
    ('Transporte',               'gasto'::tipo_movimiento,   'fijo'::naturaleza_categoria,     '#32E2A7'),
    ('Suscripciones',            'gasto'::tipo_movimiento,   'fijo'::naturaleza_categoria,     '#1C4F9C'),
    ('Supermercado',             'gasto'::tipo_movimiento,   'variable'::naturaleza_categoria, '#815737'),
    ('Comida fuera de casa',     'gasto'::tipo_movimiento,   'variable'::naturaleza_categoria, '#5C9720'),
    ('Delivery',                 'gasto'::tipo_movimiento,   'variable'::naturaleza_categoria, '#D220DF'),
    ('Salidas y ocio',           'gasto'::tipo_movimiento,   'variable'::naturaleza_categoria, '#DF8620'),
    ('Ropa',                     'gasto'::tipo_movimiento,   'variable'::naturaleza_categoria, '#378166'),
    ('Regalos',                  'gasto'::tipo_movimiento,   'variable'::naturaleza_categoria, '#AA185C'),
    ('Mascotas',                 'gasto'::tipo_movimiento,   'variable'::naturaleza_categoria, '#DAA9B6'),
    ('Otros',                    'gasto'::tipo_movimiento,   'variable'::naturaleza_categoria, '#BFDF20'),
    ('Ahorro',                   'gasto'::tipo_movimiento,   'fijo'::naturaleza_categoria,     '#602097'),
    ('Inversiones',              'gasto'::tipo_movimiento,   'fijo'::naturaleza_categoria,     '#94F0E3'),
    ('Fondo de emergencia',      'gasto'::tipo_movimiento,   'fijo'::naturaleza_categoria,     '#3A6B88'),
    ('Sueldo',                   'ingreso'::tipo_movimiento, 'fijo'::naturaleza_categoria,     '#E17770'),
    ('Freelance',                'ingreso'::tipo_movimiento, 'variable'::naturaleza_categoria, '#978020'),
    ('Ventas',                   'ingreso'::tipo_movimiento, 'variable'::naturaleza_categoria, '#9082ED'),
    ('Otros ingresos',           'ingreso'::tipo_movimiento, 'variable'::naturaleza_categoria, '#94AFF0')
$$;

-- El trigger de sembrado pasa a reusar la función de arriba en vez de tener
-- la lista hardcodeada por segunda vez (CREATE OR REPLACE no toca el
-- trigger on_auth_user_created en sí, solo el cuerpo de la función).
create or replace function public.seed_categorias_default()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.categorias (user_id, nombre, tipo, naturaleza, color)
  select new.id, nombre, tipo, naturaleza, color from public.categorias_default();
  return new;
end;
$$;

-- ============================================================================
-- 2. resetear_cuenta(): borra movimientos, presupuestos, reglas y
--    categorías del usuario que llama, y vuelve a sembrar las 23 por
--    defecto. security invoker (no definer): corre con los privilegios del
--    que llama, así que las policies de RLS de cada tabla se siguen
--    aplicando de verdad — el filtro por auth.uid() de acá abajo no es la
--    única barrera.
-- ============================================================================

create or replace function public.resetear_cuenta()
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'No hay sesión activa.';
  end if;

  delete from public.movimientos where user_id = uid;
  delete from public.presupuestos where user_id = uid;
  delete from public.reglas_categorizacion where user_id = uid;
  delete from public.categorias where user_id = uid;

  insert into public.categorias (user_id, nombre, tipo, naturaleza, color)
  select uid, nombre, tipo, naturaleza, color from public.categorias_default();
end;
$$;

grant execute on function public.resetear_cuenta() to authenticated;
