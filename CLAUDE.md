@AGENTS.md

# Pesimios Argensirios

App de finanzas personales para 3 usuarios privados (vos, tu hermano, tu
novia), cada uno con su cuenta y sus datos completamente aislados vía RLS de
Supabase. Contexto completo del producto en [README.md](README.md).

## Estado (actualizado a Fase 5)

Las 5 fases del pedido original están completas y committeadas. Ver detalle
en la sección "Estado del proyecto" del README. Lo que queda es pulido y
verificación en dispositivo de las partes marcadas abajo como no probadas
en este entorno.

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

### Correcciones entre Fase 4 y Fase 5

- **Paleta de colores de categorías rediseñada.** La original armaba los 23
  colores recorriendo el círculo de matices con paso fijo y la misma
  saturación/luminosidad para todos — con 23 categorías eso deja grupos
  casi idénticos (se reportaron 3 verdes y 3 violetas indistinguibles). La
  nueva paleta (`src/constants/categoriaColores.ts`, mismos valores en
  `supabase/migrations/002_colores.sql`) se generó maximizando distancia
  perceptual CIELAB con un piso mínimo de separación en luminosidad (L\*),
  para que no colapsen ni en escala de grises. Con 23 colores no es
  matemáticamente posible una separación grande en L\* para todos los pares
  sin sacar colores del rango que se ve bien en fondo oscuro, pero sí se
  garantiza que ninguno comparte matiz y luminosidad a la vez. Si se agregan
  categorías default nuevas, generar el color con el mismo método (ver el
  script usado, no está commiteado — era de un solo uso) en vez de elegir a
  ojo.
- **`measureLayout` no funciona bajo la New Architecture (Fabric).** Un
  primer intento de auto-scroll al campo enfocado en `MovimientoForm.tsx`
  usaba `scrollNode.measureLayout()`, que tira
  `"ref.measureLayout must be called with a ref to a native component"` en
  esta versión de RN (Fabric por defecto). Se sacó esa lógica; ahora depende
  solo de `KeyboardAvoidingView` (`behavior: 'height'` en Android, `'padding'`
  en iOS) + `automaticallyAdjustKeyboardInsets` en el `ScrollView` (esto
  último es prop de `ScrollViewPropsIOS`, **no hace nada en Android** — ojo
  si se busca una prop "cross-platform" para esto, no existe una directa).
  Confirmado en dispositivo: alcanza, no hizo falta
  `react-native-keyboard-controller`.
- `@react-native-community/datetimepicker`: `onChange` está deprecado en esta
  versión del paquete. Usar `onValueChange` (se dispara al elegir fecha) +
  `onDismiss` (se dispara al cancelar/cerrar sin elegir), no `onChange`.

### Fase 5 — presupuesto y ajustes

- **`getUserId()` se movió a `src/services/supabase.ts`** (exportado) porque
  ya lo necesitaban tres servicios (`movimientos`, `categorias`,
  `presupuestos`). Antes vivía duplicado dentro de `movimientos.ts`.
- **Borrar una categoría con movimientos asociados falla por el FK
  `on delete restrict`** de la migración 001 (código Postgres `23503`,
  foreign_key_violation). `eliminarCategoria` en `categorias.ts` distingue
  ese caso lanzando `CategoriaConMovimientosError`, y la UI
  (`CategoriaFormModal`) lo atrapa para ofrecer desactivar en su lugar en vez
  de mostrar un error genérico. No hace falta un chequeo previo — dejar que
  Postgres lo rechace y reaccionar al error es más simple y no tiene
  condición de carrera.
- **ABM de categorías: `tipo` no es editable, solo en la creación.** Así lo
  pedía el enunciado ("ABM de categorías propias: nombre, color,
  naturaleza") — cambiar el tipo de una categoría existente podría romper
  el sentido de movimientos ya cargados con ese tipo. `CategoriaFormModal`
  muestra el tipo como texto fijo en modo edición y como selector solo al
  crear.
- **Exportar CSV usa la API nueva de `expo-file-system`** (`File`, `Paths`,
  no la vieja `FileSystem.writeAsStringAsync`/`cacheDirectory`) — esta
  versión del paquete la tiene deprecada. Ver `src/services/exportarCsv.ts`.
- **`upsertPresupuesto` depende del `unique(user_id, categoria_id, anio,
  mes)`** de la tabla `presupuestos` (migración 001) vía
  `onConflict: 'user_id,categoria_id,anio,mes'`. Si ese constraint cambia de
  nombre o columnas, este `onConflict` string hay que actualizarlo a mano
  (Supabase no lo valida en tipos).

## Cosas que no se pudieron probar en este entorno

Sin dispositivo físico ni emulador, todo se probó vía `npx expo start` +
navegador. Lo siguiente no se pudo verificar ahí y conviene confirmarlo en
el dispositivo real (algunas cosas ya se confirmaron manualmente, ver abajo):

- **Swipe-to-delete en Movimientos** (`react-native-gesture-handler`
  `Swipeable`): el navegador no compone gestos de arrastre reales en este
  entorno. Todavía sin confirmar en dispositivo.
- **`@react-native-community/datetimepicker`**: no tiene versión web (se
  degrada a `null` con `console.warn`). *Ya confirmado en dispositivo* que
  abre y cierra bien con la API nueva (`onValueChange`/`onDismiss`).
- **`Alert.alert` es un no-op en `react-native-web`** (confirmado leyendo
  `node_modules/react-native-web/dist/exports/Alert/index.js`: el método
  está vacío). Todo lo que depende de una confirmación por `Alert` —
  eliminar movimiento, eliminar categoría (y su fallback a "desactivar" por
  FK violation), copiar presupuesto del mes anterior — no se pudo probar acá
  porque el diálogo nunca aparece ni dispara los callbacks. Se verificó por
  lectura de código en vez de en vivo.
- **`expo-file-system`'s `File`/`Paths` (API nueva) no tienen implementación
  real en web** — son clases stub vacías (`ExpoFileSystem.web.d.ts`). Al
  exportar CSV en el navegador tira `"this.validatePath is not a function"`
  apenas se instancia `new File(...)`. La query a Supabase y el armado del
  CSV sí corren antes de eso (se confirmó que llegan bien), pero la
  escritura a disco y el share nunca se probaron en vivo.

Además: el `Modal` de React Native con `animationType="slide"` (usado en
`SelectField` y `CategoriaFormModal`) queda visualmente trabado fuera de
pantalla en el navegador de este entorno (la animación no corre si la
pestaña no está "compositando" frames). Para probar interacciones dentro de
esos modales hubo que cambiar `animationType` a `"none"` temporalmente y
revertirlo después — no es un bug de la app, es una limitación del entorno
de pruebas.

## Dónde está cada cosa

```
src/
  app/            pantallas y layouts (expo-router, file-based routing)
  components/     MovimientoForm, MonthYearPicker, ColorSwatchPicker,
                  CategoriaFormModal, ui/ (Button, TextField, SelectField,
                  PillSelector, Banner)
  constants/      theme.ts (paleta/spacing), opciones.ts (tipo/medio de pago),
                  categoriaColores.ts (paleta para el ABM, ver Fase 5)
  contexts/       AuthContext, CategoriasContext, DashboardPeriodContext
  lib/            format.ts (moneda/fecha), metrics.ts (agregaciones puras),
                  csv.ts (arma el string CSV, sin tocar filesystem)
  services/       ÚNICO lugar que llama a supabase.ts directamente
                  (incluye exportarCsv.ts, que sí toca filesystem/sharing)
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
