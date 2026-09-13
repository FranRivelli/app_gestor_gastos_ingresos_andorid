import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { PieChart } from 'react-native-gifted-charts';

import { OPCIONES_MEDIO_PAGO } from '@/constants/opciones';
import { Colors, FontSize, Radius, Spacing } from '@/constants/theme';
import { useCategorias } from '@/contexts/CategoriasContext';
import { useDashboardPeriod } from '@/contexts/DashboardPeriodContext';
import { formatMonto, formatMontoCorto } from '@/lib/format';
import {
  calcularGastoPorMedioPago,
  calcularResumenMes,
  calcularTendenciaMeses,
  ultimosSeisMeses,
  type PuntoTendencia,
  type ResumenCategoria,
  type ResumenMedioPago,
  type ResumenMes,
} from '@/lib/metrics';
import { traducirErrorDatos } from '@/services/errors';
import { fetchMovimientos, fetchMovimientosRango } from '@/services/movimientos';
import { fetchPresupuestos } from '@/services/presupuestos';
import type { Presupuesto } from '@/types/database';

const MEDIO_PAGO_LABEL = Object.fromEntries(OPCIONES_MEDIO_PAGO.map((o) => [o.value, o.label]));

const NOMBRES_MES_CORTO = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
const ALTURA_GRAFICO_TENDENCIA = 140;

// Redondea hacia arriba al próximo "número lindo" (1/2/5 × 10^n) para que el
// techo del eje no sea un valor arbitrario como $100.527 sino algo legible
// como $200k.
function calcularEscalaNice(valorMaximo: number): number {
  if (valorMaximo <= 0) return 100;
  const exponente = Math.floor(Math.log10(valorMaximo));
  const base = Math.pow(10, exponente);
  const normalizado = valorMaximo / base;
  const nice = normalizado <= 1 ? 1 : normalizado <= 2 ? 2 : normalizado <= 5 ? 5 : 10;
  return nice * base;
}

export default function InicioScreen() {
  const { anio, mes } = useDashboardPeriod();
  const { width } = useWindowDimensions();
  const { categorias } = useCategorias();

  const [resumen, setResumen] = useState<ResumenMes | null>(null);
  const [tendencia, setTendencia] = useState<PuntoTendencia[]>([]);
  const [presupuestos, setPresupuestos] = useState<Presupuesto[]>([]);
  const [gastoPorMedioPago, setGastoPorMedioPago] = useState<ResumenMedioPago[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [categoriaTocada, setCategoriaTocada] = useState<ResumenCategoria | null>(null);
  const [barraTocada, setBarraTocada] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setLoading(true);
    setError(null);
    setCategoriaTocada(null);
    setBarraTocada(null);
    try {
      const meses = ultimosSeisMeses(anio, mes);
      const primero = meses[0];
      const desde = `${primero.anio}-${String(primero.mes).padStart(2, '0')}-01`;
      const ultimoDiaMesActual = new Date(anio, mes, 0).getDate();
      const hasta = `${anio}-${String(mes).padStart(2, '0')}-${String(ultimoDiaMesActual).padStart(2, '0')}`;

      const [movimientosMes, movimientosRango, presupuestosMes] = await Promise.all([
        fetchMovimientos({ anio, mes }),
        fetchMovimientosRango(desde, hasta),
        fetchPresupuestos(anio, mes),
      ]);

      setResumen(calcularResumenMes(movimientosMes));
      setTendencia(calcularTendenciaMeses(movimientosRango, meses));
      setPresupuestos(presupuestosMes);
      setGastoPorMedioPago(calcularGastoPorMedioPago(movimientosMes));
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
    () =>
      resumen?.gastosPorCategoria.map((c) => ({
        value: c.monto,
        color: c.color,
        onPress: () => setCategoriaTocada((prev) => (prev?.categoriaId === c.categoriaId ? null : c)),
      })) ?? [],
    [resumen]
  );

  const filasPresupuesto = useMemo(() => {
    return presupuestos
      .map((p) => {
        const cat = categorias.find((c) => c.id === p.categoria_id);
        const gastoCat = resumen?.gastosPorCategoria.find((g) => g.categoriaId === p.categoria_id);
        return {
          categoriaId: p.categoria_id,
          nombre: cat?.nombre ?? 'Categoría eliminada',
          color: cat?.color ?? Colors.textSecondary,
          presupuestado: p.monto_presupuestado,
          real: gastoCat?.monto ?? 0,
        };
      })
      .sort((a, b) => b.real / (b.presupuestado || 1) - a.real / (a.presupuestado || 1));
  }, [presupuestos, categorias, resumen]);

  const montoMaximoMedioPago =
    gastoPorMedioPago.length > 0 ? Math.max(...gastoPorMedioPago.map((m) => m.monto)) : 0;

  const hayDatosTendencia = tendencia.some((p) => p.ingresos > 0 || p.gastos > 0);
  const escalaTendencia = useMemo(
    () => calcularEscalaNice(Math.max(1, ...tendencia.flatMap((p) => [p.ingresos, p.gastos]))),
    [tendencia]
  );
  const marcasEscalaTendencia = useMemo(() => {
    const pasos = 4;
    return Array.from({ length: pasos + 1 }, (_, i) => (escalaTendencia / pasos) * (pasos - i));
  }, [escalaTendencia]);

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
                focusOnPress
                toggleFocusOnPress
                centerLabelComponent={() => (
                  <View style={styles.pieCenter}>
                    <Text style={styles.pieCenterValor} numberOfLines={1} adjustsFontSizeToFit>
                      {formatMonto(categoriaTocada ? categoriaTocada.monto : resumen.gastos)}
                    </Text>
                    <Text style={styles.pieCenterLabel} numberOfLines={1}>
                      {categoriaTocada ? categoriaTocada.nombre : 'gastado'}
                    </Text>
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
        <Text style={styles.cardTitle}>Presupuestado vs. real</Text>
        {filasPresupuesto.length === 0 ? (
          <View style={styles.presupuestoVacio}>
            <Text style={styles.emptyText}>Todavía no cargaste presupuestos para este mes.</Text>
            <Pressable onPress={() => router.push('/presupuesto')} hitSlop={8}>
              <Text style={styles.presupuestoVacioLink}>Ir a Presupuesto →</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.barLista}>
            {filasPresupuesto.map((f) => {
              const excedido = f.real > f.presupuestado;
              const pct = f.presupuestado > 0 ? Math.min(100, (f.real / f.presupuestado) * 100) : 0;
              return (
                <View key={f.categoriaId} style={styles.presupuestoFila}>
                  <View style={styles.presupuestoEncabezado}>
                    <Text style={styles.presupuestoNombre} numberOfLines={1}>
                      {f.nombre}
                    </Text>
                    <Text style={[styles.presupuestoValores, excedido && styles.presupuestoExcedido]}>
                      {formatMontoCorto(f.real)} / {formatMontoCorto(f.presupuestado)}
                    </Text>
                  </View>
                  <View style={styles.barListaTrack}>
                    <View
                      style={[
                        styles.barListaFill,
                        { backgroundColor: excedido ? Colors.expense : f.color, width: `${pct}%` },
                      ]}
                    />
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Gasto por medio de pago</Text>
        {gastoPorMedioPago.length === 0 ? (
          <Text style={styles.emptyText}>Todavía no cargaste gastos este mes.</Text>
        ) : (
          <View style={styles.barLista}>
            {gastoPorMedioPago.map((m) => (
              <View key={m.medioPago} style={styles.barListaFila}>
                <Text style={styles.barListaNombre}>{MEDIO_PAGO_LABEL[m.medioPago]}</Text>
                <View style={styles.barListaTrack}>
                  <View
                    style={[
                      styles.barListaFill,
                      {
                        backgroundColor: Colors.accent,
                        width: `${montoMaximoMedioPago > 0 ? (m.monto / montoMaximoMedioPago) * 100 : 0}%`,
                      },
                    ]}
                  />
                </View>
                <Text style={styles.barListaValor}>{formatMontoCorto(m.monto)}</Text>
              </View>
            ))}
          </View>
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Ingresos vs. gastos (últimos 6 meses)</Text>
        <View style={styles.leyendaBarras}>
          <View style={styles.legendRowSimple}>
            <View style={[styles.legendDot, { backgroundColor: Colors.income }]} />
            <Text style={styles.legendTextoSimple}>Ingresos</Text>
          </View>
          <View style={styles.legendRowSimple}>
            <View style={[styles.legendDot, { backgroundColor: Colors.expense }]} />
            <Text style={styles.legendTextoSimple}>Gastos</Text>
          </View>
        </View>

        {!hayDatosTendencia ? (
          <Text style={styles.emptyText}>Todavía no hay movimientos en este rango.</Text>
        ) : (
          <>
            <View style={styles.tendenciaGrafico}>
              <View style={styles.tendenciaEscala}>
                {marcasEscalaTendencia.map((valor) => (
                  <Text key={valor} style={styles.tendenciaEscalaTexto}>
                    {formatMontoCorto(valor)}
                  </Text>
                ))}
              </View>
              <View style={styles.tendenciaPlot}>
                {marcasEscalaTendencia.map((valor) => (
                  <View
                    key={valor}
                    style={[
                      styles.tendenciaLinea,
                      { bottom: (valor / escalaTendencia) * ALTURA_GRAFICO_TENDENCIA },
                    ]}
                  />
                ))}
                <View style={styles.tendenciaBarrasFila}>
                  {tendencia.map((punto) => {
                    const claveIngreso = `${punto.anio}-${punto.mes}-ingreso`;
                    const claveGasto = `${punto.anio}-${punto.mes}-gasto`;
                    return (
                      <View key={`${punto.anio}-${punto.mes}`} style={styles.tendenciaParDeBarras}>
                        <BarraTendencia
                          valor={punto.ingresos}
                          escalaMax={escalaTendencia}
                          color={Colors.income}
                          seleccionada={barraTocada === claveIngreso}
                          onPress={() => setBarraTocada((prev) => (prev === claveIngreso ? null : claveIngreso))}
                        />
                        <BarraTendencia
                          valor={punto.gastos}
                          escalaMax={escalaTendencia}
                          color={Colors.expense}
                          seleccionada={barraTocada === claveGasto}
                          onPress={() => setBarraTocada((prev) => (prev === claveGasto ? null : claveGasto))}
                        />
                      </View>
                    );
                  })}
                </View>
              </View>
            </View>
            <View style={styles.tendenciaEtiquetas}>
              <View style={styles.tendenciaEscalaEspaciador} />
              <View style={styles.tendenciaEtiquetasFila}>
                {tendencia.map((punto) => (
                  <Text key={`${punto.anio}-${punto.mes}`} style={styles.tendenciaMesLabel}>
                    {NOMBRES_MES_CORTO[punto.mes - 1]}
                  </Text>
                ))}
              </View>
            </View>
          </>
        )}
      </View>
    </ScrollView>
  );
}

function BarraTendencia({
  valor,
  escalaMax,
  color,
  seleccionada,
  onPress,
}: {
  valor: number;
  escalaMax: number;
  color: string;
  seleccionada: boolean;
  onPress: () => void;
}) {
  const altura = Math.max(2, (valor / escalaMax) * ALTURA_GRAFICO_TENDENCIA);
  return (
    <Pressable onPress={onPress} style={styles.tendenciaBarraWrap}>
      {seleccionada ? (
        <View style={[styles.tendenciaTooltip, { bottom: altura + 4 }]}>
          <Text style={styles.tendenciaTooltipTexto}>{formatMonto(valor)}</Text>
        </View>
      ) : null}
      <View style={[styles.tendenciaBarra, { height: altura, backgroundColor: color }]} />
    </Pressable>
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
  legendTextoSimple: {
    color: Colors.text,
    fontSize: FontSize.sm,
  },
  barLista: {
    gap: Spacing.sm,
  },
  barListaFila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  barListaNombre: {
    width: 96,
    color: Colors.text,
    fontSize: FontSize.xs,
  },
  barListaTrack: {
    flex: 1,
    height: 10,
    borderRadius: Radius.full,
    backgroundColor: Colors.surfaceAlt,
    overflow: 'hidden',
  },
  barListaFill: {
    height: '100%',
    borderRadius: Radius.full,
    minWidth: 4,
  },
  barListaValor: {
    width: 56,
    textAlign: 'right',
    color: Colors.textSecondary,
    fontSize: FontSize.xs,
    fontWeight: '600',
  },
  presupuestoVacio: {
    alignItems: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.lg,
  },
  presupuestoVacioLink: {
    color: Colors.accent,
    fontSize: FontSize.sm,
    fontWeight: '600',
  },
  presupuestoFila: {
    gap: 4,
  },
  presupuestoEncabezado: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  presupuestoNombre: {
    flex: 1,
    color: Colors.text,
    fontSize: FontSize.xs,
  },
  presupuestoValores: {
    color: Colors.textSecondary,
    fontSize: FontSize.xs,
    fontWeight: '600',
  },
  presupuestoExcedido: {
    color: Colors.expense,
  },
  tendenciaGrafico: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  tendenciaEscala: {
    width: 40,
    height: ALTURA_GRAFICO_TENDENCIA,
    justifyContent: 'space-between',
  },
  tendenciaEscalaTexto: {
    color: Colors.textSecondary,
    fontSize: FontSize.xs,
    textAlign: 'right',
  },
  tendenciaPlot: {
    flex: 1,
    height: ALTURA_GRAFICO_TENDENCIA,
    position: 'relative',
  },
  tendenciaLinea: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: StyleSheet.hairlineWidth,
    backgroundColor: Colors.border,
  },
  tendenciaBarrasFila: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: ALTURA_GRAFICO_TENDENCIA,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.md,
    paddingHorizontal: Spacing.xs,
  },
  tendenciaParDeBarras: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 3,
    width: 27,
    height: ALTURA_GRAFICO_TENDENCIA,
  },
  tendenciaBarraWrap: {
    flex: 1,
    height: ALTURA_GRAFICO_TENDENCIA,
    justifyContent: 'flex-end',
    position: 'relative',
  },
  tendenciaBarra: {
    width: '100%',
    borderRadius: 3,
  },
  tendenciaTooltip: {
    position: 'absolute',
    left: -20,
    right: -20,
    alignItems: 'center',
  },
  tendenciaTooltipTexto: {
    backgroundColor: Colors.surfaceAlt,
    color: Colors.text,
    fontSize: 10,
    fontWeight: '700',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radius.sm,
    overflow: 'hidden',
  },
  tendenciaEtiquetas: {
    flexDirection: 'row',
  },
  tendenciaEscalaEspaciador: {
    width: 40 + Spacing.sm,
  },
  tendenciaEtiquetasFila: {
    flex: 1,
    flexDirection: 'row',
    gap: Spacing.md,
    paddingHorizontal: Spacing.xs,
  },
  tendenciaMesLabel: {
    width: 27,
    textAlign: 'center',
    color: Colors.textSecondary,
    fontSize: FontSize.xs,
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
