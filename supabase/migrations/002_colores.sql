-- Pesimios Argensirios: paleta de colores de categorías (fix)
-- Correr en el SQL Editor del dashboard de Supabase, después de 001_schema.sql.
--
-- Problema: la paleta original armaba los 23 colores recorriendo el círculo
-- de matices con el mismo salto fijo (15°) y la misma saturación/luminosidad
-- para todos. Categorías vecinas en esa recorrida (que no tienen por qué
-- estar lejos entre sí en la UI: la lista se muestra alfabética, la torta se
-- ordena por monto) terminaban con colores casi idénticos — tres verdes casi
-- iguales (Comida fuera de casa, Delivery, Supermercado), tres violetas casi
-- iguales (Ahorro, Fondo de emergencia, Inversiones).
--
-- Esta paleta nueva se generó maximizando la distancia perceptual (CIELAB)
-- entre las 23 elegidas, con un piso mínimo de separación en luminosidad
-- (L*) para que ni siquiera colapsen en escala de grises. Con 23 colores no
-- es matemáticamente posible garantizar una separación grande en L* para
-- absolutamente todos los pares sin sacar colores del rango que se ve bien
-- sobre fondo oscuro (#12151C) — pero sí se garantiza que ninguna categoría
-- comparte matiz Y luminosidad con otra a la vez (que era el bug real), y
-- que L* queda repartido en casi todo el rango útil (~29 a ~89) en vez de
-- amontonado en una sola franja como antes.
--
-- Actualiza por nombre, así no se pierden los movimientos ya cargados contra
-- esas categorías (la fila se actualiza in-place, no se recrea).

update public.categorias set color = '#D22D2D' where nombre = 'Alquiler/Vivienda';
update public.categorias set color = '#20DF20' where nombre = 'Servicios';
update public.categorias set color = '#2020DF' where nombre = 'Internet y telefonía';
update public.categorias set color = '#20B9DF' where nombre = 'Salud';
update public.categorias set color = '#EDD882' where nombre = 'Educación';
update public.categorias set color = '#E481DA' where nombre = 'Seguros';
update public.categorias set color = '#32E2A7' where nombre = 'Transporte';
update public.categorias set color = '#1C4F9C' where nombre = 'Suscripciones';
update public.categorias set color = '#815737' where nombre = 'Supermercado';
update public.categorias set color = '#5C9720' where nombre = 'Comida fuera de casa';
update public.categorias set color = '#D220DF' where nombre = 'Delivery';
update public.categorias set color = '#DF8620' where nombre = 'Salidas y ocio';
update public.categorias set color = '#378166' where nombre = 'Ropa';
update public.categorias set color = '#AA185C' where nombre = 'Regalos';
update public.categorias set color = '#DAA9B6' where nombre = 'Mascotas';
update public.categorias set color = '#BFDF20' where nombre = 'Otros';
update public.categorias set color = '#602097' where nombre = 'Ahorro';
update public.categorias set color = '#94F0E3' where nombre = 'Inversiones';
update public.categorias set color = '#3A6B88' where nombre = 'Fondo de emergencia';
update public.categorias set color = '#E17770' where nombre = 'Sueldo';
update public.categorias set color = '#978020' where nombre = 'Freelance';
update public.categorias set color = '#9082ED' where nombre = 'Ventas';
update public.categorias set color = '#94AFF0' where nombre = 'Otros ingresos';

-- Recrea la función del trigger con la misma paleta, para que las cuentas
-- nuevas (si alguna vez se agrega una cuarta persona) también la reciban.
-- El CREATE OR REPLACE no toca el trigger en sí (on_auth_user_created),
-- solo reemplaza el cuerpo de la función que ya está enganchada a él.
create or replace function public.seed_categorias_default()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.categorias (user_id, nombre, tipo, naturaleza, color) values
    (new.id, 'Alquiler/Vivienda',        'gasto',   'fijo',     '#D22D2D'),
    (new.id, 'Servicios',                'gasto',   'fijo',     '#20DF20'),
    (new.id, 'Internet y telefonía',     'gasto',   'fijo',     '#2020DF'),
    (new.id, 'Salud',                    'gasto',   'fijo',     '#20B9DF'),
    (new.id, 'Educación',                'gasto',   'fijo',     '#EDD882'),
    (new.id, 'Seguros',                  'gasto',   'fijo',     '#E481DA'),
    (new.id, 'Transporte',               'gasto',   'fijo',     '#32E2A7'),
    (new.id, 'Suscripciones',            'gasto',   'fijo',     '#1C4F9C'),
    (new.id, 'Supermercado',             'gasto',   'variable', '#815737'),
    (new.id, 'Comida fuera de casa',     'gasto',   'variable', '#5C9720'),
    (new.id, 'Delivery',                 'gasto',   'variable', '#D220DF'),
    (new.id, 'Salidas y ocio',           'gasto',   'variable', '#DF8620'),
    (new.id, 'Ropa',                     'gasto',   'variable', '#378166'),
    (new.id, 'Regalos',                  'gasto',   'variable', '#AA185C'),
    (new.id, 'Mascotas',                 'gasto',   'variable', '#DAA9B6'),
    (new.id, 'Otros',                    'gasto',   'variable', '#BFDF20'),
    (new.id, 'Ahorro',                   'gasto',   'fijo',     '#602097'),
    (new.id, 'Inversiones',              'gasto',   'fijo',     '#94F0E3'),
    (new.id, 'Fondo de emergencia',      'gasto',   'fijo',     '#3A6B88'),
    (new.id, 'Sueldo',                   'ingreso', 'fijo',     '#E17770'),
    (new.id, 'Freelance',                'ingreso', 'variable', '#978020'),
    (new.id, 'Ventas',                   'ingreso', 'variable', '#9082ED'),
    (new.id, 'Otros ingresos',           'ingreso', 'variable', '#94AFF0');
  return new;
end;
$$;
