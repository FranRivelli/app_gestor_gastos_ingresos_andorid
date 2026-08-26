import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { MonthYearPicker } from '@/components/MonthYearPicker';
import { Banner } from '@/components/ui/Banner';
import { Button } from '@/components/ui/Button';
import { Colors, FontSize, Radius, Spacing } from '@/constants/theme';
import { useCategorias } from '@/contexts/CategoriasContext';
import { formatMonto } from '@/lib/format';
import { calcularResumenMes } from '@/lib/metrics';
import { traducirErrorDatos } from '@/services/errors';
import { fetchMovimientos } from '@/services/movimientos';
import { copiarPresupuesto, fetchPresupuestos, upsertPresupuesto } from '@/services/presupuestos';
import type { Categoria, Presupuesto } from '@/types/database';

function mesAnterior(anio: number, mes: number): { anio: number; mes: number } {
  return mes === 1 ? { anio: anio - 1, mes: 12 } : { anio, mes: mes - 1 };
}

export default function PresupuestoScreen() {
  const { categorias } = useCategorias();
  const hoy = new Date();
  const [anio, setAnio] = useState(hoy.getFullYear());
  const [mes, setMes] = useState(hoy.getMonth() + 1);

  const [presupuestos, setPresupuestos] = useState<Presupuesto[]>([]);
  const [gastoPorCategoria, setGastoPorCategoria] = useState<Map<string, number>>(new Map());
  const [loading, setLoading] = useState(true);
  const [copiando, setCopiando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const categoriasGasto = useMemo(
    () => categorias.filter((c) => c.tipo === 'gasto' && c.activa).sort((a, b) => a.nombre.localeCompare(b.nombre)),
    [categorias]
  );

  const cargar = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [presupuestosData, movimientosGasto] = await Promise.all([
        fetchPresupuestos(anio, mes),
        fetchMovimientos({ anio, mes, tipo: 'gasto' }),
      ]);
      setPresupuestos(presupuestosData);
      const resumen = calcularResumenMes(movimientosGasto);
      setGastoPorCategoria(new Map(resumen.gastosPorCategoria.map((c) => [c.categoriaId, c.monto])));
    } catch (err) {
      setError(traducirErrorDatos(err));
    } finally {
      setLoading(false);
    }
  }, [anio, mes]);

  useFocusEffect(
    useCallback(() => {
      cargar();
    }, [cargar])
  );

  async function handleGuardarPresupuesto(categoriaId: string, monto: number) {
    const actualizado = await upsertPresupuesto(categoriaId, anio, mes, monto);
    setPresupuestos((prev) => [...prev.filter((p) => p.categoria_id !== categoriaId), actualizado]);
  }

  function handleCopiarMesAnterior() {
    const origen = mesAnterior(anio, mes);
    Alert.alert(
      'Copiar presupuesto',
      'Se va a copiar el presupuesto del mes anterior a este mes, pisando los valores que ya tengas cargados acá. ¿Continuar?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Copiar',
          onPress: async () => {
            setCopiando(true);
            setError(null);
            try {
              const cantidad = await copiarPresupuesto(origen, { anio, mes });
              if (cantidad === 0) {
                Alert.alert('Nada para copiar', 'El mes anterior no tiene presupuestos cargados.');
              }
              await cargar();
            } catch (err) {
              setError(traducirErrorDatos(err));
            } finally {
              setCopiando(false);
            }
          },
        },
      ]
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <MonthYearPicker
        anio={anio}
        mes={mes}
        onChange={(nuevoAnio, nuevoMes) => {
          setAnio(nuevoAnio);
          setMes(nuevoMes);
        }}
      />

      <Button
        title="Copiar presupuesto del mes anterior"
        variant="secondary"
        onPress={handleCopiarMesAnterior}
        loading={copiando}
      />

      {error ? <Banner message={error} /> : null}

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={Colors.accent} />
        </View>
      ) : categoriasGasto.length === 0 ? (
        <Text style={styles.emptyText}>No tenés categorías de gasto activas.</Text>
      ) : (
        <View style={styles.lista}>
          {categoriasGasto.map((categoria) => (
            <FilaPresupuesto
              key={categoria.id}
              categoria={categoria}
              presupuestado={presupuestos.find((p) => p.categoria_id === categoria.id)?.monto_presupuestado ?? 0}
              gastado={gastoPorCategoria.get(categoria.id) ?? 0}
              onGuardar={(monto) => handleGuardarPresupuesto(categoria.id, monto)}
            />
          ))}
        </View>
      )}
    </ScrollView>
  );
}

function FilaPresupuesto({
  categoria,
  presupuestado,
  gastado,
  onGuardar,
}: {
  categoria: Categoria;
  presupuestado: number;
  gastado: number;
  onGuardar: (monto: number) => Promise<void>;
}) {
  const [texto, setTexto] = useState(presupuestado > 0 ? String(presupuestado).replace('.', ',') : '');
  const [guardando, setGuardando] = useState(false);

  async function handleBlur() {
    const normalizado = texto.trim().replace(',', '.');
    const valor = normalizado ? Number(normalizado) : 0;
    if (Number.isNaN(valor) || valor < 0) {
      setTexto(presupuestado > 0 ? String(presupuestado).replace('.', ',') : '');
      return;
    }
    if (valor === presupuestado) return;

    setGuardando(true);
    try {
      await onGuardar(valor);
    } finally {
      setGuardando(false);
    }
  }

  const porcentaje = presupuestado > 0 ? Math.min((gastado / presupuestado) * 100, 100) : 0;
  const porcentajeReal = presupuestado > 0 ? (gastado / presupuestado) * 100 : 0;
  const colorBarra = porcentajeReal > 100 ? Colors.expense : porcentajeReal >= 80 ? Colors.warning : Colors.income;

  return (
    <View style={styles.fila}>
      <View style={styles.filaHeader}>
        <View style={[styles.dot, { backgroundColor: categoria.color }]} />
        <Text style={styles.filaNombre} numberOfLines={1}>
          {categoria.nombre}
        </Text>
        <TextInput
          value={texto}
          onChangeText={setTexto}
          onBlur={handleBlur}
          keyboardType="decimal-pad"
          placeholder="Sin definir"
          placeholderTextColor={Colors.textSecondary}
          style={styles.input}
          editable={!guardando}
        />
      </View>

      {presupuestado > 0 ? (
        <>
          <View style={styles.barraFondo}>
            <View style={[styles.barraProgreso, { width: `${porcentaje}%`, backgroundColor: colorBarra }]} />
          </View>
          <Text style={styles.filaDetalle}>
            {formatMonto(gastado)} de {formatMonto(presupuestado)} ({porcentajeReal.toFixed(0)}%)
          </Text>
        </>
      ) : gastado > 0 ? (
        <Text style={styles.filaDetalle}>{formatMonto(gastado)} gastado, sin presupuesto definido</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: Spacing.lg,
    gap: Spacing.lg,
    paddingBottom: Spacing.xxl,
  },
  centered: {
    paddingVertical: Spacing.xxl,
    alignItems: 'center',
  },
  emptyText: {
    color: Colors.textSecondary,
    fontSize: FontSize.md,
    textAlign: 'center',
    paddingVertical: Spacing.xxl,
  },
  lista: {
    gap: Spacing.md,
  },
  fila: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  filaHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  filaNombre: {
    flex: 1,
    color: Colors.text,
    fontSize: FontSize.md,
    fontWeight: '600',
  },
  input: {
    width: 110,
    textAlign: 'right',
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    color: Colors.text,
    fontSize: FontSize.sm,
  },
  barraFondo: {
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.background,
    overflow: 'hidden',
  },
  barraProgreso: {
    height: 8,
    borderRadius: 4,
  },
  filaDetalle: {
    color: Colors.textSecondary,
    fontSize: FontSize.xs,
  },
});
