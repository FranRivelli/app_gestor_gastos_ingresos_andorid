# Pesimios Argensirios

App de finanzas personales para uso privado (3 cuentas independientes, datos
aislados entre sí vía Row Level Security de Supabase).

Stack: Expo + TypeScript + expo-router, Supabase (Auth + Postgres), Context/hooks
para estado, `react-native-gifted-charts` para gráficos, `date-fns` para fechas.

## Estado del proyecto

- **Fase 1 (lista):** proyecto Expo, tema oscuro, cliente de Supabase, tipos de
  la base, migración SQL con RLS y sembrado de categorías.
- **Fase 2 (lista):** registro, login, sesión persistida, rutas protegidas
  (`Stack.Protected` de expo-router), recuperar contraseña, cerrar sesión,
  errores traducidos al español.
- **Fase 3 (lista):** bottom tabs (Inicio, Cargar, Movimientos, Presupuesto) +
  ícono de Ajustes en el header; pantalla Cargar completa (con foco automático,
  categorías filtradas por tipo, confirmación y vibración al guardar); pantalla
  Movimientos completa (agrupada por fecha, filtros por mes/tipo/categoría,
  total filtrado, deslizar para borrar, tocar para editar, pull to refresh).
- **Fase 4 (lista):** dashboard de Inicio con selector de mes/año en el header,
  4 tarjetas de métricas, torta de gastos por categoría con leyenda y
  porcentajes, barras horizontales de top categorías, y barras de ingresos vs.
  gastos de los últimos 6 meses.
- **Fase 5 (lista):** pantalla Presupuesto (definir monto por categoría y mes,
  barra de progreso verde/amarillo/rojo, copiar presupuesto del mes anterior);
  Ajustes real (ABM de categorías con selector de color, no deja borrar una
  categoría con movimientos —ofrece desactivarla—, exportar movimientos a
  CSV con expo-sharing, cerrar sesión).

Con esto están las 5 fases del pedido original. Lo que queda es pulido y
verificación en dispositivo de las partes que no se pueden probar por
navegador (ver sección de abajo y `CLAUDE.md`).

## Requisitos previos

- Node.js LTS (instalado).
- Una cuenta de Expo (opcional, solo hace falta para `eas build`).
- El proyecto de Supabase ya creado, con su URL y su **publishable key**
  (prefijo `sb_publishable_`, sistema nuevo de claves — no la legacy `anon key`).

## 1. Instalar dependencias (Windows / PowerShell)

```bash
npm install
```

## 2. Completar el `.env`

Copiá `.env.example` a `.env` (no lo subas a git, ya está en `.gitignore`):

```bash
copy .env.example .env
```

Completá las dos variables con los datos de tu proyecto de Supabase
(Project Settings → API):

```
EXPO_PUBLIC_SUPABASE_URL=https://TU-PROYECTO.supabase.co
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxxxxxxxxxxx
```

La app inicializa el cliente con `createClient(url, publishableKey)`. La
**secret key** (`sb_secret_`) nunca va en la app — esa key saltea RLS por
completo y solo debería usarse en contextos de servidor de confianza.

## 3. Correr la migración en el SQL Editor de Supabase

El archivo [supabase/migrations/001_schema.sql](supabase/migrations/001_schema.sql)
tiene todo el esquema: tablas, políticas de RLS y el trigger que siembra las
categorías por defecto para cada usuario nuevo.

1. Entrá al [dashboard de Supabase](https://supabase.com/dashboard) → tu
   proyecto → **SQL Editor** → **New query**.
2. Pegá el contenido completo de `supabase/migrations/001_schema.sql`.
3. Ejecutá (**Run**).

No hace falta (ni se recomienda) correr esto con la CLI de Supabase contra el
proyecto remoto — se corre a mano, una sola vez, desde el SQL Editor.

### Verificar que RLS quedó bien configurado

[supabase/tests/rls_check.sql](supabase/tests/rls_check.sql) es un script de
solo lectura para correr en el mismo SQL Editor después de la migración.
Devuelve una fila por tabla (`categorias`, `movimientos`, `presupuestos`) con
si RLS está habilitado y si existen las cuatro políticas (SELECT/INSERT/
UPDATE/DELETE); la columna `estado` dice `OK` o detalla qué falta. Es la forma
recomendada de confirmar el aislamiento entre usuarios contra la base real, en
vez de confiar solo en que el cliente filtre bien.

### ¿Por qué el sembrado de categorías es un trigger y no código del cliente?

Ver el comentario en la sección 4 de `001_schema.sql`, resumen:

1. **Atomicidad**: el usuario y sus categorías se crean en la misma
   transacción de Postgres — no hay ventana donde exista un usuario sin
   categorías.
2. **RLS**: justo después del signup (sobre todo con confirmación de email
   pendiente) el cliente puede no tener todavía una sesión con JWT válido, así
   que un insert desde la app podría chocar contra las políticas de RLS. El
   trigger corre `security definer`, con privilegios elevados, y no depende de
   que haya una sesión activa.
3. **Una sola fuente de verdad**: el set de categorías por defecto vive en un
   solo lugar (la base), no duplicado y potencialmente desincronizado en el
   bundle de cada instalación de la app.

## 4. Levantar la app

```bash
npx expo start
```

Escaneá el QR con la app **Expo Go** (Android/iOS) desde el mismo Wi-Fi que la
computadora. Con el `.env` sin completar, la pantalla inicial va a avisar que
faltan las variables de entorno en vez de romperse.

## 5. Generar un APK para instalar en otros celulares (EAS Build)

1. Instalá la CLI de EAS (una sola vez):

   ```bash
   npm install -g eas-cli
   ```

2. Iniciá sesión con tu cuenta de Expo:

   ```bash
   eas login
   ```

3. Configurá el proyecto para builds (una sola vez, genera `eas.json`):

   ```bash
   eas build:configure
   ```

4. Generá un APK de prueba (perfil `preview`, instalable directo sin pasar por
   Play Store):

   ```bash
   eas build --platform android --profile preview
   ```

   Si `eas.json` no trae un perfil `preview` con `"buildType": "apk"`, agregalo
   así en `eas.json`:

   ```json
   {
     "build": {
       "preview": {
         "android": {
           "buildType": "apk"
         }
       }
     }
   }
   ```

5. Al terminar, EAS te da un link de descarga del `.apk`. Se comparte por
   WhatsApp/Drive/lo que sea y se instala habilitando "orígenes desconocidos"
   en el celular Android.

## Íconos y splash

`assets/logo.png` es la fuente. `assets/icon.png`, `assets/adaptive-icon.png`,
`assets/splash-icon.png` y `assets/favicon.png` se generaron a partir de ese
archivo con `scripts/generate-icons.js` (usa `sharp`, se instala al vuelo con
`npm install --no-save sharp` si hace falta volver a correrlo):

```bash
npm install --no-save sharp
node scripts/generate-icons.js
```

Volvé a correrlo si reemplazás `assets/logo.png` por un logo nuevo.

## Estructura

```
src/
  app/            pantallas y layouts (expo-router, file-based routing)
  constants/      tema (colores, spacing, tipografía)
  services/       toda la comunicación con Supabase vive acá
  types/          tipos TypeScript de las tablas de la base
supabase/
  migrations/     SQL para correr a mano en el SQL Editor
```
