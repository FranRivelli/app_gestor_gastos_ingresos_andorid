-- Pesimios Argensirios: identificador de lote + timestamp para deshacer una
-- importación completa de Mercado Pago (Fase 6)
-- Correr manualmente en el SQL Editor del dashboard de Supabase, o via
-- `npx supabase db push`.
--
-- id_externo identifica una FILA (el ID de operación de MP), no un LOTE: no
-- hay forma de saber, mirando solo id_externo, qué filas vinieron del mismo
-- click en "Guardar" de la pantalla de importación. lote_importacion_id sí
-- lo resuelve: se genera un valor nuevo en el cliente una sola vez por
-- importación y se les pone el mismo valor a todas las filas de esa tanda.
-- No es un uuid real (se genera sin agregar una dependencia nueva para
-- eso) sino un string opaco, así que la columna es `text`, no `uuid` — y por
-- ser opaco no sirve para mostrárselo al usuario ("seleccionar el lote
-- b3f8a1-x92kq" no dice nada), de ahí fecha_importacion: mismo criterio,
-- un solo timestamp generado en el cliente al tocar "Guardar" y repetido en
-- todas las filas de esa tanda, para poder armar un texto tipo "los 32
-- movimientos importados el 03/09 a las 14:20".
--
-- Ambas nullable: los movimientos cargados a mano no pertenecen a ningún lote.

alter table public.movimientos
  add column lote_importacion_id text;

alter table public.movimientos
  add column fecha_importacion timestamptz;

-- Índice parcial (solo filas con lote) para que "seleccionar todos los de
-- esta importación" sea instantáneo incluso con muchos movimientos.
create index movimientos_lote_importacion_idx
  on public.movimientos (user_id, lote_importacion_id)
  where lote_importacion_id is not null;
