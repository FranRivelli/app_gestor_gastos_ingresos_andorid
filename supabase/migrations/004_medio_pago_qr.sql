-- Pesimios Argensirios: agrega 'QR' como medio de pago (Fase 6)
-- Correr manualmente en el SQL Editor del dashboard de Supabase, o via
-- `npx supabase db push`.
--
-- Los pagos con QR de Mercado Pago no encajan en ninguna de las 4 opciones
-- existentes (efectivo/débito/crédito/transferencia): no son ni transferencia
-- bancaria tradicional ni una tarjeta física. Se agrega como quinta opción
-- del enum en vez de forzarlos a "transferencia".
--
-- ALTER TYPE ... ADD VALUE no se puede revertir con un DROP fácil y en
-- versiones viejas de Postgres no podía correr dentro de una transacción con
-- otros statements; Postgres 12+ (lo que usa Supabase) sí lo permite siempre
-- que el valor nuevo no se use en la misma transacción, que es justo este caso
-- (statement único, no se inserta ninguna fila acá).

alter type medio_pago add value 'QR';
