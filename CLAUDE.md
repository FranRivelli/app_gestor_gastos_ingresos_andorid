@AGENTS.md

# Pesimios Argensirios

App de finanzas personales para 3 usuarios privados (vos, tu hermano, tu
novia), cada uno con su cuenta y sus datos completamente aislados vía RLS de
Supabase. Contexto completo del producto en [README.md](README.md).

## Estado (actualizado a Fase 4)

Fases 1 a 4 completas y committeadas. Ver detalle en la sección "Estado del
proyecto" del README. Quedan Fase 5 (presupuesto, ABM de categorías, exportar
CSV, Ajustes real) y pulido final.

Cada fase se cerró con: `npx tsc --noEmit` limpio, prueba end-to-end contra el
Supabase real del usuario (vía navegador, sin dispositivo físico disponible en
este entorno), y commit propio.

## Decisiones importantes por fase (y por qué)

### Fase 1 — base

- **Tema oscuro fijo, sin modo claro.** No se armó un sistema light/dark
  porque el pedido original solo daba paleta oscura y decía "por defecto"; se
  interpretó como único tema. Si en algún momento se pide modo claro, hay que
  diseñar la paleta completa antes de tocar `src/constants/theme.ts`.
- **Sembrado de categorías por trigger `security definer`, no desde el
  cliente.** Ver el comentario largo en `supabase/migrations/001_schema.sql`
  (sección 4) y en el README: atomicidad, RLS justo después del signup, y una
  sola fuente de verdad para el set de categorías default.
- **`assets/logo.png` original eran bytes JPEG con extensión `.png`.** Se
  re-encodó con `scripts/generate-icons.js` (usa `sharp`, se instala al vuelo
  con `npm install --no-save sharp`). Si se reemplaza el logo, correr ese
  script de nuevo.
- El scaffold de `create-expo-app` trajo consigo un `.git` con un commit ajeno
  de un directorio temporal; se borró antes de que el usuario inicializara su
  propio repo (después se enteró de que `eas build:configure` ya lo había
  hecho por su cuenta, con commit "Initial commit").

### Fase 2 — autenticación

- **`src/services/supabase.ts` tiene un guard `typeof window !== 'undefined'`
  para el storage de auth.** El render estático de expo-router para web (SSR
  en Node) no tiene `window`, y `AsyncStorage` lo necesita. Sin el guard, el
  cliente de Supabase crashea el proceso de Node apenas se inicializa. No
  afecta Android/iOS (ahí `window` siempre existe).
- **Rutas protegidas con `Stack.Protected`** (`src/app/_layout.tsx`), patrón
  oficial de expo-router para esta versión — no armar guards manuales por
  grupo.
- Traducción de errores de Supabase Auth centralizada en
  `src/services/errors.ts` (`traducirErrorAuth`). Si aparece un código de
  error de Supabase nuevo sin traducir, cae al mensaje genérico — no se
  filtra nunca el mensaje crudo en inglés a la UI.

### Fase 3 — tabs, Cargar, Movimientos

- **Bug real encontrado:** los tipos de tabla en `src/types/database.ts`
  tienen que ser `type`, **no `interface`**. TypeScript no les da "índice
  implícito" cuando se comparan estructuralmente contra
  `Record<string, GenericTable>` (que es lo que pide `supabase-js` para
  resolver el schema) salvo que sean `type` — con `interface`, `.insert()` y
  `.update()` colapsan silenciosamente a `never` sin ningún error obvio en el
  punto de la llamada. Si se agrega una tabla nueva (ej. en Fase 5), copiar el
  patrón existente (type, con `Relationships` explícito) y no "prolijizar" a
  interface.
- **El tipo `Insert` de cada tabla incluye `user_id`,** aunque el
  `NuevoMovimiento` que reciben los servicios lo excluye (el servicio lo
  agrega él mismo vía `getUserId()` + spread antes del insert). Son dos capas
  de tipos a propósito: el schema real de la base vs. la conveniencia del
  caller.
- Estructura de rutas: `(app)/_layout.tsx` es un `Stack` con `(tabs)`,
  `ajustes` y `movimiento/[id]` como screens. `(app)/(tabs)/_layout.tsx` es el
  `Tabs` real. El ícono de Ajustes vive en `headerRight` del `Tabs`
  (compartido por las 4 pestañas), no en cada pantalla individual.
- `GestureHandlerRootView` envuelve toda la app en `src/app/_layout.tsx`
  (necesario para `Swipeable` de Movimientos).
- Con rutas tipadas (`experiments.typedRoutes` en `app.json`), navegar a una
  ruta dinámica requiere la forma objeto:
  `router.push({ pathname: '/movimiento/[id]', params: { id } })`, no un
  template string. Si se agrega una ruta nueva y TypeScript se queja de que
  no existe, correr `npx expo start` una vez para que regenere
  `.expo/types/router.d.ts` antes de volver a tipar.

### Fase 4 — dashboard y gráficos

- **`expo-linear-gradient` es dependencia dura de `BarChart`,** aunque no se
  use ningún gradiente. La cadena de imports de `react-native-gifted-charts`
  hace `require('expo-linear-gradient')` en el módulo que arma las barras
  normales (`Animated2DWithGradient.js`), y tira si no está instalado. No
  pasa con `PieChart` (usa `RadialGradient` de `react-native-svg`, sin
  dependencia extra). Si se agrega otro chart type de la librería, revisar
  primero si importa algo de `Components/common/LinearGradient`.
- **Tasa de ahorro matcheada por *nombre* de categoría** (`'Ahorro'`,
  `'Inversiones'`) en `src/lib/metrics.ts` — no hay ninguna columna que marque
  una categoría como "de ahorro". Si en Fase 5 (ABM de categorías) el usuario
  renombra esas dos, dejan de contar para este cálculo. Es una limitación
  conocida, no un bug.
- Selector de mes/año en el header de Inicio se comparte con el body de la
  pantalla vía `DashboardPeriodContext` (`src/contexts/`), porque el header
  custom (`headerTitle` del `Tabs.Screen`) y la pantalla son componentes
  distintos en el árbol de expo-router.
- Formato de moneda (`$ 1.234.567,89`) y de fecha (`dd/mm/aaaa`) están
  implementados a mano en `src/lib/format.ts`, sin `Intl`, porque el soporte
  de datos ICU de Hermes para `es-AR` no está garantizado en todas las
  builds. No reemplazar por `Intl.NumberFormat` sin verificar antes en un
  build real (no en el navegador, que sí tiene ICU completo).

## Cosas que no se pudieron probar en este entorno

Sin dispositivo físico ni emulador, todo se probó vía `npx expo start` +
navegador. Dos cosas específicas de gestos/nativo no se pudieron verificar
ahí y conviene confirmarlas en el dispositivo real:

- **Swipe-to-delete en Movimientos** (`react-native-gesture-handler`
  `Swipeable`): el navegador no compone gestos de arrastre reales en este
  entorno.
- **`@react-native-community/datetimepicker`** en el formulario de
  Cargar/Editar: no tiene versión web (se degrada a `null` con un
  `console.warn`), así que el flujo de cambiar la fecha nunca se ejecutó acá.

Además: el `Modal` de React Native con `animationType="slide"` (usado en
`SelectField`) queda visualmente trabado fuera de pantalla en el navegador de
este entorno (la animación no corre si la pestaña no está "compositando"
frames). Para probar interacciones dentro de ese modal hubo que cambiar
`animationType` a `"none"` temporalmente y revertirlo después — no es un bug
de la app, es una limitación del entorno de pruebas.

## Dónde está cada cosa

```
src/
  app/            pantallas y layouts (expo-router, file-based routing)
  components/     MovimientoForm, MonthYearPicker, ui/ (Button, TextField,
                  SelectField, PillSelector, Banner)
  constants/      theme.ts (paleta/spacing), opciones.ts (tipo/medio de pago)
  contexts/       AuthContext, CategoriasContext, DashboardPeriodContext
  lib/            format.ts (moneda/fecha), metrics.ts (agregaciones puras)
  services/       ÚNICO lugar que llama a supabase.ts directamente
  types/          database.ts — tipos de las tablas (deben ser `type`, ver arriba)
supabase/
  migrations/     SQL para correr a mano en el SQL Editor
  tests/          rls_check.sql — verificación de RLS/políticas
```

## Cómo levantar y probar (resumen — detalle completo en README)

```bash
npm install
npx tsc --noEmit
npx expo start
```

El `.env` (no versionado) necesita `EXPO_PUBLIC_SUPABASE_URL` y
`EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. El usuario ya corrió las migraciones
y tiene su propio dev client de Android compilado (con
`@react-native-community/datetimepicker` y `expo-linear-gradient` incluidos).
