import { Ionicons } from '@expo/vector-icons';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { useFocusEffect, useNavigation, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  BackHandler,
  Pressable,
  RefreshControl,
  SectionList,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AjustesHeaderButton } from '@/components/AjustesHeaderButton';
import { MonthYearPicker } from '@/components/MonthYearPicker';
import { PillSelector } from '@/components/ui/PillSelector';
import { SelectField } from '@/components/ui/SelectField';
import { Snackbar } from '@/components/ui/Snackbar';
import { OPCIONES_MEDIO_PAGO } from '@/constants/opciones';
import { Colors, FontSize, Radius, Spacing } from '@/constants/theme';
import { useCategorias } from '@/contexts/CategoriasContext';
import { capitalizar, formatFechaHora, formatMonto } from '@/lib/format';
import { traducirErrorDatos } from '@/services/errors';
import {
  eliminarMovimientos,
  fetchLoteImportacion,
  fetchMovimientos,
  type InfoLoteImportacion,
} from '@/services/movimientos';
import type { MovimientoConCategoria, TipoMovimiento } from '@/types/database';

const DEMORA_DESHACER_MS = 5000;

type TipoFiltro = 'todos' | TipoMovimiento;

const OPCIONES_TIPO_FILTRO: { value: TipoFiltro; label: string }[] = [
  { value: 'todos', label: 'Todos' },
  { value: 'gasto', label: 'Gastos' },
  { value: 'ingreso', label: 'Ingresos' },
];

const medioPagoLabel = Object.fromEntries(OPCIONES_MEDIO_PAGO.map((o) => [o.value, o.label]));

interface Seccion {
  title: string;
  data: MovimientoConCategoria[];
}

export default function MovimientosScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const { categorias } = useCategorias();

  const hoy = new Date();
  const [anio, setAnio] = useState(hoy.getFullYear());
  const [mes, setMes] = useState(hoy.getMonth() + 1);
  const [tipoFiltro, setTipoFiltro] = useState<TipoFiltro>('todos');
  const [categoriaFiltro, setCategoriaFiltro] = useState<string | null>(null);

  const [movimientos, setMovimientos] = useState<MovimientoConCategoria[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [modoSeleccion, setModoSeleccion] = useState(false);
  const [seleccionados, setSeleccionados] = useState<Set<string>>(new Set());
  const [loteImportacion, setLoteImportacion] = useState<InfoLoteImportacion | null>(null);

  const [snackbarMensaje, setSnackbarMensaje] = useState<string | null>(null);
  const borradoPendienteRef = useRef<{
    ids: string[];
    filasBorradas: MovimientoConCategoria[];
    timeout: ReturnType<typeof setTimeout>;
  } | null>(null);

  const cargar = useCallback(
    async (mostrarSpinner = true) => {
      if (mostrarSpinner) setLoading(true);
      setError(null);
      try {
        const datos = await fetchMovimientos({
          anio,
          mes,
          tipo: tipoFiltro === 'todos' ? undefined : tipoFiltro,
          categoriaId: categoriaFiltro ?? undefined,
        });
        setMovimientos(datos);
      } catch (err) {
        setError(traducirErrorDatos(err));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [anio, mes, tipoFiltro, categoriaFiltro]
  );

  useFocusEffect(
    useCallback(() => {
      cargar();
    }, [cargar])
  );

  function handleCambiarTipoFiltro(nuevo: TipoFiltro) {
    setTipoFiltro(nuevo);
    if (nuevo !== 'todos' && categoriaFiltro) {
      const cat = categorias.find((c) => c.id === categoriaFiltro);
      if (cat && cat.tipo !== nuevo) setCategoriaFiltro(null);
    }
  }

  const opcionesCategoriaFiltro = useMemo(() => {
    const base = tipoFiltro === 'todos' ? categorias : categorias.filter((c) => c.tipo === tipoFiltro);
    return [{ value: null, label: 'Todas' }, ...base.map((c) => ({ value: c.id, label: c.nombre, color: c.color }))];
  }, [categorias, tipoFiltro]);

  const secciones = useMemo<Seccion[]>(() => {
    const grupos = new Map<string, MovimientoConCategoria[]>();
    for (const mov of movimientos) {
      const lista = grupos.get(mov.fecha) ?? [];
      lista.push(mov);
      grupos.set(mov.fecha, lista);
    }
    return Array.from(grupos.entries()).map(([fecha, data]) => ({
      title: capitalizar(format(parseISO(fecha), "EEEE d 'de' MMMM", { locale: es })),
      data,
    }));
  }, [movimientos]);

  const total = useMemo(
    () => movimientos.reduce((acc, m) => acc + (m.tipo === 'ingreso' ? m.monto : -m.monto), 0),
    [movimientos]
  );

  function ordenarMovimientos(lista: MovimientoConCategoria[]): MovimientoConCategoria[] {
    return [...lista].sort((a, b) => b.fecha.localeCompare(a.fecha) || b.created_at.localeCompare(a.created_at));
  }

  // Ejecuta el DELETE real contra Supabase. Si falla, repone las filas en
  // la lista (ya estaban ocultas de forma optimista) en vez de perderlas en
  // silencio.
  function ejecutarBorradoReal(pendiente: { ids: string[]; filasBorradas: MovimientoConCategoria[] }) {
    eliminarMovimientos(pendiente.ids).catch((err) => {
      setMovimientos((prev) => ordenarMovimientos([...prev, ...pendiente.filasBorradas]));
      Alert.alert('No se pudo eliminar', traducirErrorDatos(err));
    });
  }

  // Si ya había un borrado esperando confirmación cuando arranca uno nuevo,
  // se efectiviza el anterior ya mismo (no tiene sentido pisarlo ni sumar
  // sus filas al nuevo "deshacer").
  function efectivizarBorradoPendiente() {
    const pendiente = borradoPendienteRef.current;
    if (!pendiente) return;
    clearTimeout(pendiente.timeout);
    borradoPendienteRef.current = null;
    ejecutarBorradoReal(pendiente);
  }

  // Borrado optimista con deshacer: la fila desaparece de la UI al toque,
  // pero el DELETE real en Supabase se difiere unos segundos. Se prefirió
  // este enfoque (en vez de borrar ya y reinsertar si se deshace) porque acá
  // "deshacer" nunca implica reinsertar nada — evita por completo el riesgo
  // de chocar con el unique constraint de id_externo al recrear una fila
  // importada, y no hay que reconstruir a mano cada columna de memoria.
  function borrarConDeshacer(ids: string[], mensaje: string) {
    efectivizarBorradoPendiente();

    const filasBorradas = movimientos.filter((m) => ids.includes(m.id));
    setMovimientos((prev) => prev.filter((m) => !ids.includes(m.id)));

    const timeout = setTimeout(() => {
      const pendiente = borradoPendienteRef.current;
      borradoPendienteRef.current = null;
      setSnackbarMensaje(null);
      if (pendiente) ejecutarBorradoReal(pendiente);
    }, DEMORA_DESHACER_MS);

    borradoPendienteRef.current = { ids, filasBorradas, timeout };
    setSnackbarMensaje(mensaje);
  }

  function deshacerBorrado() {
    const pendiente = borradoPendienteRef.current;
    if (!pendiente) return;
    clearTimeout(pendiente.timeout);
    borradoPendienteRef.current = null;
    setMovimientos((prev) => ordenarMovimientos([...prev, ...pendiente.filasBorradas]));
    setSnackbarMensaje(null);
  }

  function handleEliminar(id: string) {
    Alert.alert('Eliminar movimiento', '¿Seguro que querés eliminarlo?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: () => borrarConDeshacer([id], 'Movimiento eliminado.'),
      },
    ]);
  }

  function entrarModoSeleccion(item: MovimientoConCategoria) {
    setModoSeleccion(true);
    setSeleccionados(new Set([item.id]));
    setLoteImportacion(null);
    if (item.lote_importacion_id) {
      fetchLoteImportacion(item.lote_importacion_id).then(setLoteImportacion).catch(() => {});
    }
  }

  function salirModoSeleccion() {
    setModoSeleccion(false);
    setSeleccionados(new Set());
    setLoteImportacion(null);
  }

  function seleccionarLote() {
    if (!loteImportacion) return;
    setSeleccionados((prev) => new Set([...prev, ...loteImportacion.ids]));
  }

  function toggleSeleccion(id: string) {
    setSeleccionados((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function seleccionarTodos() {
    setSeleccionados(new Set(movimientos.map((m) => m.id)));
  }

  function handleEliminarLote() {
    const cantidad = seleccionados.size;
    if (cantidad === 0) return;
    const ids = Array.from(seleccionados);
    Alert.alert(
      'Eliminar movimientos',
      `¿Seguro que querés eliminar ${cantidad} movimiento${cantidad === 1 ? '' : 's'}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => {
            salirModoSeleccion();
            borrarConDeshacer(ids, `${cantidad} movimiento${cantidad === 1 ? '' : 's'} eliminado${cantidad === 1 ? '' : 's'}.`);
          },
        },
      ]
    );
  }

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (modoSeleccion) {
        salirModoSeleccion();
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, [modoSeleccion]);

  // navigation.setOptions hace merge de objetos: pasar `undefined` en una
  // clave la deja en `undefined` en vez de "no tocarla" (un spread con una
  // clave explícita en undefined la pisa igual). Por eso acá SIEMPRE se da
  // un valor concreto para las tres — nunca `undefined` — para no depender
  // de que cabalgue de vuelta al default del navigator.
  useEffect(() => {
    navigation.setOptions({
      headerTitle: modoSeleccion
        ? () => (
            <Text style={styles.headerSeleccionTitulo}>
              {seleccionados.size} seleccionado{seleccionados.size === 1 ? '' : 's'}
            </Text>
          )
        : () => <Text style={styles.headerSeleccionTitulo}>Movimientos</Text>,
      headerLeft: modoSeleccion
        ? () => (
            <Pressable onPress={salirModoSeleccion} hitSlop={12} style={styles.headerBoton}>
              <Ionicons name="close" size={24} color={Colors.text} />
            </Pressable>
          )
        : () => null,
      headerRight: modoSeleccion
        ? () => (
            <Pressable
              onPress={handleEliminarLote}
              hitSlop={12}
              style={styles.headerBoton}
              disabled={seleccionados.size === 0}
            >
              <Ionicons
                name="trash-outline"
                size={22}
                color={seleccionados.size === 0 ? Colors.textSecondary : Colors.expense}
              />
            </Pressable>
          )
        : () => <AjustesHeaderButton />,
    });
  }, [modoSeleccion, seleccionados, navigation]);

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={styles.filtros}>
        <MonthYearPicker
          anio={anio}
          mes={mes}
          onChange={(nuevoAnio, nuevoMes) => {
            setAnio(nuevoAnio);
            setMes(nuevoMes);
          }}
        />
        <PillSelector value={tipoFiltro} options={OPCIONES_TIPO_FILTRO} onChange={handleCambiarTipoFiltro} />
        <SelectField
          label="Categoría"
          value={categoriaFiltro}
          options={opcionesCategoriaFiltro}
          onChange={setCategoriaFiltro}
          placeholder="Todas"
        />

        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Total filtrado</Text>
          <Text style={[styles.totalValor, { color: total >= 0 ? Colors.income : Colors.expense }]}>
            {formatMonto(total)}
          </Text>
        </View>
      </View>

      {modoSeleccion ? (
        <Pressable onPress={seleccionarTodos} style={styles.seleccionTodosFila}>
          <Text style={styles.seleccionTodosTexto}>Seleccionar todos ({movimientos.length})</Text>
        </Pressable>
      ) : null}
      {modoSeleccion && loteImportacion ? (
        <Pressable onPress={seleccionarLote} style={styles.seleccionTodosFila}>
          <Text style={styles.seleccionTodosTexto}>
            Seleccionar los {loteImportacion.ids.length} movimientos importados
            {loteImportacion.fechaImportacion ? ` el ${formatFechaHora(loteImportacion.fechaImportacion)}` : ''}
          </Text>
        </Pressable>
      ) : null}

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={Colors.accent} />
        </View>
      ) : error ? (
        <View style={styles.centered}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : (
        <SectionList
          sections={secciones}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                cargar(false);
              }}
              tintColor={Colors.accent}
            />
          }
          ListEmptyComponent={
            <View style={styles.centered}>
              <Text style={styles.emptyText}>No hay movimientos para este filtro.</Text>
            </View>
          }
          renderSectionHeader={({ section }) => <Text style={styles.sectionHeader}>{section.title}</Text>}
          renderItem={({ item }) => {
            const seleccionado = seleccionados.has(item.id);
            const fila = (
              <Pressable
                style={styles.fila}
                onPress={() =>
                  modoSeleccion
                    ? toggleSeleccion(item.id)
                    : router.push({ pathname: '/movimiento/[id]', params: { id: item.id } })
                }
                onLongPress={() => {
                  if (!modoSeleccion) entrarModoSeleccion(item);
                }}
              >
                {modoSeleccion ? (
                  <Ionicons
                    name={seleccionado ? 'checkbox' : 'square-outline'}
                    size={22}
                    color={seleccionado ? Colors.accent : Colors.textSecondary}
                  />
                ) : (
                  <View style={[styles.dot, { backgroundColor: item.categoria.color }]} />
                )}
                <View style={styles.filaContenido}>
                  <Text style={styles.filaCategoria}>{item.categoria.nombre}</Text>
                  <Text style={styles.filaDetalle}>
                    {medioPagoLabel[item.medio_pago]}
                    {item.descripcion ? ` · ${item.descripcion}` : ''}
                  </Text>
                </View>
                <Text style={[styles.filaMonto, { color: item.tipo === 'ingreso' ? Colors.income : Colors.expense }]}>
                  {item.tipo === 'ingreso' ? '+' : '-'}
                  {formatMonto(item.monto)}
                </Text>
              </Pressable>
            );

            if (modoSeleccion) return fila;

            return (
              <Swipeable
                renderRightActions={() => (
                  <Pressable style={styles.borrarAccion} onPress={() => handleEliminar(item.id)}>
                    <Ionicons name="trash-outline" size={20} color={Colors.text} />
                  </Pressable>
                )}
              >
                {fila}
              </Swipeable>
            );
          }}
        />
      )}

      <Snackbar visible={snackbarMensaje !== null} mensaje={snackbarMensaje ?? ''} onAccion={deshacerBorrado} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  filtros: {
    padding: Spacing.lg,
    gap: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  totalLabel: {
    color: Colors.textSecondary,
    fontSize: FontSize.sm,
  },
  totalValor: {
    fontSize: FontSize.lg,
    fontWeight: '700',
  },
  listContent: {
    flexGrow: 1,
    paddingBottom: Spacing.xl,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xxl,
    paddingHorizontal: Spacing.xl,
  },
  errorText: {
    color: Colors.expense,
    fontSize: FontSize.md,
    textAlign: 'center',
  },
  emptyText: {
    color: Colors.textSecondary,
    fontSize: FontSize.md,
    textAlign: 'center',
  },
  sectionHeader: {
    backgroundColor: Colors.background,
    color: Colors.textSecondary,
    fontSize: FontSize.sm,
    fontWeight: '600',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xs,
  },
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  filaContenido: {
    flex: 1,
  },
  filaCategoria: {
    color: Colors.text,
    fontSize: FontSize.md,
    fontWeight: '600',
  },
  filaDetalle: {
    color: Colors.textSecondary,
    fontSize: FontSize.xs,
    marginTop: 2,
  },
  filaMonto: {
    fontSize: FontSize.md,
    fontWeight: '700',
  },
  borrarAccion: {
    backgroundColor: Colors.expense,
    justifyContent: 'center',
    alignItems: 'center',
    width: 72,
  },
  headerSeleccionTitulo: {
    color: Colors.text,
    fontSize: FontSize.md,
    fontWeight: '700',
  },
  headerBoton: {
    paddingHorizontal: 16,
  },
  seleccionTodosFila: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  seleccionTodosTexto: {
    color: Colors.accent,
    fontSize: FontSize.sm,
    fontWeight: '600',
  },
});
