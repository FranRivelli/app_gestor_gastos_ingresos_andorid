# Pesimios Argensirios

App de finanzas personales para un grupo chico y cerrado (3 cuentas: yo, mi
hermano, mi novia). Cada uno carga sus propios ingresos y gastos, ve su
dashboard con gráficos, arma presupuestos por categoría y puede importar
movimientos directo desde un resumen de Mercado Pago — todo con los datos
de cada usuario completamente aislados de los otros dos.

## Stack

- **Expo + React Native + TypeScript** (`expo-router`, file-based routing)
- **Supabase** — Postgres, Auth y Row Level Security para el aislamiento
  entre usuarios, Edge Functions (Deno) para parsear resúmenes de Mercado
  Pago
- `react-native-gifted-charts` para los gráficos del dashboard, `date-fns`
  para fechas

## Instalación y uso

Requiere Node.js LTS y un proyecto de Supabase ya creado.

```bash
npm install
copy .env.example .env
```

Completá `.env` con la URL y la publishable key de tu proyecto de Supabase
(Project Settings → API → prefijo `sb_publishable_`):

```
EXPO_PUBLIC_SUPABASE_URL=https://TU-PROYECTO.supabase.co
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxxxxxxxxxxx
```

Corré las migraciones de `supabase/migrations/` en orden (001 a 006) desde
el **SQL Editor** del dashboard de Supabase — pegar y ejecutar cada archivo
una vez, no hace falta la CLI.

```bash
npx expo start
```

Escaneá el QR con **Expo Go** desde el celular, en la misma red Wi-Fi que
la computadora.

## Capturas

<!-- Pegar acá las capturas de pantalla (dashboard, cargar movimiento, presupuesto, etc.) -->

## Qué aprendí / Qué le falta

**Aprendí:**
- Diseñar RLS en Supabase en serio: cada tabla con políticas por
  `user_id`, y el sembrado de categorías por defecto resuelto con un
  trigger `security definer` en vez de código del cliente, para que sea
  atómico con el signup y no dependa de que ya exista una sesión con JWT.
- Un bug no obvio de TypeScript + `supabase-js`: los tipos de tabla tienen
  que declararse con `type`, no `interface` — con `interface`, `.insert()`
  y `.update()` colapsan silenciosamente a `never` sin error visible en el
  punto de la llamada.
- Desarrollar sin dispositivo físico tiene límites reales: cosas como
  `Alert.alert` (no-op en `react-native-web`) o el swipe-to-delete de
  `react-native-gesture-handler` no se pueden probar en el navegador y hay
  que verificarlas leyendo código o, ya en Fase 6, en un dispositivo real.

**Le falta:**
- Terminar de confirmar en dispositivo físico algunas interacciones que
  solo se probaron por navegador (swipe-to-delete, exportar CSV).
- Modo claro (hoy el tema oscuro es fijo, no hay toggle).
- Pulir la categorización automática al importar movimientos de Mercado
  Pago — hoy usa reglas simples, se puede mejorar con más casos reales.
