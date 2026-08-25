import { Ionicons } from '@expo/vector-icons';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, RefreshControl, SectionList, StyleSheet, Text, View } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MonthYearPicker } from '@/components/MonthYearPicker';
import { PillSelector } from '@/components/ui/PillSelector';
import { SelectField } from '@/components/ui/SelectField';
import { OPCIONES_MEDIO_PAGO } from '@/constants/opciones';
import { Colors, FontSize, Radius, Spacing } from '@/constants/theme';
import { useCategorias } from '@/contexts/CategoriasContext';
import { capitalizar, formatMonto } from '@/lib/format';
import { traducirErrorDatos } from '@/services/errors';
import { eliminarMovimiento, fetchMovimientos } from '@/services/movimientos';
import type { MovimientoConCategoria, TipoMovimiento } from '@/types/database';

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

  function handleEliminar(id: string) {
    Alert.alert('Eliminar movimiento', '¿Seguro que querés eliminarlo? Esta acción no se puede deshacer.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          try {
            await eliminarMovimiento(id);
            setMovimientos((prev) => prev.filter((m) => m.id !== id));
          } catch (err) {
            Alert.alert('No se pudo eliminar', traducirErrorDatos(err));
          }
        },
      },
    ]);
  }

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
          renderItem={({ item }) => (
            <Swipeable
              renderRightActions={() => (
                <Pressable style={styles.borrarAccion} onPress={() => handleEliminar(item.id)}>
                  <Ionicons name="trash-outline" size={20} color={Colors.text} />
                </Pressable>
              )}
            >
              <Pressable
                style={styles.fila}
                onPress={() => router.push({ pathname: '/movimiento/[id]', params: { id: item.id } })}
              >
                <View style={[styles.dot, { backgroundColor: item.categoria.color }]} />
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
            </Swipeable>
          )}
        />
      )}
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
});
