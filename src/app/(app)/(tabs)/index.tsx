import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { BarChart, PieChart } from 'react-native-gifted-charts';

import { Colors, FontSize, Radius, Spacing } from '@/constants/theme';
import { useDashboardPeriod } from '@/contexts/DashboardPeriodContext';
import { formatMonto } from '@/lib/format';
import {
  calcularResumenMes,
  calcularTendenciaMeses,
  ultimosSeisMeses,
  type PuntoTendencia,
  type ResumenMes,
} from '@/lib/metrics';
import { traducirErrorDatos } from '@/services/errors';
import { fetchMovimientos, fetchMovimientosRango } from '@/services/movimientos';

const NOMBRES_MES_CORTO = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

export default function InicioScreen() {
  const { anio, mes } = useDashboardPeriod();
  const { width } = useWindowDimensions();

  const [resumen, setResumen] = useState<ResumenMes | null>(null);
  const [tendencia, setTendencia] = useState<PuntoTendencia[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const meses = ultimosSeisMeses(anio, mes);
      const primero = meses[0];
      const desde = `${primero.anio}-${String(primero.mes).padStart(2, '0')}-01`;
      const ultimoDiaMesActual = new Date(anio, mes, 0).getDate();
      const hasta = `${anio}-${String(mes).padStart(2, '0')}-${String(ultimoDiaMesActual).padStart(2, '0')}`;

      const [movimientosMes, movimientosRango] = await Promise.all([
        fetchMovimientos({ anio, mes }),
        fetchMovimientosRango(desde, hasta),
      ]);

      setResumen(calcularResumenMes(movimientosMes));
      setTendencia(calcularTendenciaMeses(movimientosRango, meses));
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

  const contentWidth = width - Spacing.lg * 2 - Spacing.lg * 2;
  const radioTorta = Math.max(60, Math.min(contentWidth, 280) / 3.2);
  const radioInterno = Math.max(radioTorta - 26, 20);

  const datosTorta = useMemo(
    () => resumen?.gastosPorCategoria.map((c) => ({ value: c.monto, color: c.color })) ?? [],
    [resumen]
  );

  const topCategorias = useMemo(() => resumen?.gastosPorCategoria.slice(0, 6) ?? [], [resumen]);
  const montoMaximoTop = topCategorias.length > 0 ? Math.max(...topCategorias.map((c) => c.monto)) : 0;

  const datosBarrasTop = useMemo(
    () =>
      topCategorias.map((c) => ({
        value: c.monto,
        label: c.nombre.length > 12 ? `${c.nombre.slice(0, 11)}…` : c.nombre,
        frontColor: c.color,
      })),
    [topCategorias]
  );

  const datosTendencia = useMemo(() => {
    const items: { value: number; frontColor: string; spacing?: number; label?: string; labelWidth?: number; labelTextStyle?: object }[] = [];
    for (const punto of tendencia) {
      items.push({ value: punto.ingresos, frontColor: Colors.income, spacing: 2 });
      items.push({
        value: punto.gastos,
        frontColor: Colors.expense,
        spacing: 18,
        label: NOMBRES_MES_CORTO[punto.mes - 1],
        labelWidth: 40,
        labelTextStyle: { color: Colors.textSecondary, fontSize: FontSize.xs },
      });
    }
    return items;
  }, [tendencia]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={Colors.accent} />
      </View>
    );
  }

  if (error || !resumen) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error ?? 'No se pudo cargar el resumen.'}</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.grid}>
        <MetricCard label="Ingresos del mes" valor={resumen.ingresos} color={Colors.income} />
        <MetricCard label="Gastos del mes" valor={resumen.gastos} color={Colors.expense} />
        <MetricCard
          label="Balance"
          valor={resumen.balance}
          color={resumen.balance >= 0 ? Colors.income : Colors.expense}
        />
        <MetricCard
          label="Tasa de ahorro"
          valorTexto={`${resumen.tasaAhorro.toFixed(1)}%`}
          color={Colors.accent}
        />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Gastos por categoría</Text>
        {resumen.gastosPorCategoria.length === 0 ? (
          <Text style={styles.emptyText}>Todavía no cargaste gastos este mes.</Text>
        ) : (
          <>
            <View style={styles.pieContainer}>
              <PieChart
                data={datosTorta}
                donut
                radius={radioTorta}
                innerRadius={radioInterno}
                innerCircleColor={Colors.surface}
                centerLabelComponent={() => (
                  <View style={styles.pieCenter}>
                    <Text style={styles.pieCenterValor}>{formatMonto(resumen.gastos)}</Text>
                    <Text style={styles.pieCenterLabel}>gastado</Text>
                  </View>
                )}
              />
            </View>
            <View style={styles.legend}>
              {resumen.gastosPorCategoria.map((c) => (
                <View key={c.categoriaId} style={styles.legendRow}>
                  <View style={[styles.legendDot, { backgroundColor: c.color }]} />
                  <Text style={styles.legendNombre} numberOfLines={1}>
                    {c.nombre}
                  </Text>
                  <Text style={styles.legendPorcentaje}>{c.porcentaje.toFixed(1)}%</Text>
                  <Text style={styles.legendMonto}>{formatMonto(c.monto)}</Text>
                </View>
              ))}
            </View>
          </>
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Top categorías del mes</Text>
        {datosBarrasTop.length === 0 ? (
          <Text style={styles.emptyText}>Todavía no cargaste gastos este mes.</Text>
        ) : (
          <BarChart
            data={datosBarrasTop}
            horizontal
            width={contentWidth - 90}
            height={datosBarrasTop.length * 34}
            barWidth={18}
            spacing={22}
            initialSpacing={10}
            endSpacing={0}
            yAxisLabelWidth={90}
            yAxisTextStyle={{ color: Colors.textSecondary, fontSize: FontSize.xs }}
            xAxisThickness={0}
            yAxisThickness={0}
            hideRules
            hideYAxisText={false}
            disableScroll
            maxValue={montoMaximoTop * 1.15}
            barBorderRadius={4}
            isAnimated
          />
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Ingresos vs. gastos (últimos 6 meses)</Text>
        <View style={styles.leyendaBarras}>
          <View style={styles.legendRowSimple}>
            <View style={[styles.legendDot, { backgroundColor: Colors.income }]} />
            <Text style={styles.legendNombre}>Ingresos</Text>
          </View>
          <View style={styles.legendRowSimple}>
            <View style={[styles.legendDot, { backgroundColor: Colors.expense }]} />
            <Text style={styles.legendNombre}>Gastos</Text>
          </View>
        </View>
        <BarChart
          data={datosTendencia}
          width={contentWidth}
          height={180}
          barWidth={14}
          initialSpacing={12}
          endSpacing={10}
          yAxisTextStyle={{ color: Colors.textSecondary, fontSize: FontSize.xs }}
          xAxisLabelTextStyle={{ color: Colors.textSecondary, fontSize: FontSize.xs }}
          xAxisThickness={0.5}
          xAxisColor={Colors.border}
          yAxisThickness={0}
          rulesColor={Colors.border}
          noOfSections={3}
          disableScroll
          barBorderRadius={3}
          isAnimated
        />
      </View>
    </ScrollView>
  );
}

function MetricCard({
  label,
  valor,
  valorTexto,
  color,
}: {
  label: string;
  valor?: number;
  valorTexto?: string;
  color: string;
}) {
  return (
    <View style={styles.metricCard}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={[styles.metricValor, { color }]} numberOfLines={1} adjustsFontSizeToFit>
        {valorTexto ?? formatMonto(valor ?? 0)}
      </Text>
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
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  errorText: {
    color: Colors.expense,
    fontSize: FontSize.md,
    textAlign: 'center',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  metricCard: {
    flexBasis: '47%',
    flexGrow: 1,
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    gap: Spacing.xs,
  },
  metricLabel: {
    color: Colors.textSecondary,
    fontSize: FontSize.xs,
  },
  metricValor: {
    fontSize: FontSize.lg,
    fontWeight: '700',
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    gap: Spacing.md,
  },
  cardTitle: {
    color: Colors.text,
    fontSize: FontSize.md,
    fontWeight: '700',
  },
  emptyText: {
    color: Colors.textSecondary,
    fontSize: FontSize.sm,
    textAlign: 'center',
    paddingVertical: Spacing.lg,
  },
  pieContainer: {
    alignItems: 'center',
  },
  pieCenter: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  pieCenterValor: {
    color: Colors.text,
    fontSize: FontSize.sm,
    fontWeight: '700',
  },
  pieCenterLabel: {
    color: Colors.textSecondary,
    fontSize: FontSize.xs,
  },
  legend: {
    gap: Spacing.sm,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  legendRowSimple: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  leyendaBarras: {
    flexDirection: 'row',
    gap: Spacing.lg,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendNombre: {
    flex: 1,
    color: Colors.text,
    fontSize: FontSize.sm,
  },
  legendPorcentaje: {
    color: Colors.textSecondary,
    fontSize: FontSize.xs,
    width: 44,
    textAlign: 'right',
  },
  legendMonto: {
    color: Colors.text,
    fontSize: FontSize.xs,
    width: 90,
    textAlign: 'right',
  },
});
