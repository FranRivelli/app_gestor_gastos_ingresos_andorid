import { Ionicons } from '@expo/vector-icons';
import { addMonths, format, subMonths } from 'date-fns';
import { es } from 'date-fns/locale';
import { useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/Button';
import { Colors, FontSize, Radius, Spacing } from '@/constants/theme';
import { capitalizar } from '@/lib/format';
import { fetchAnioMovimientoMasAntiguo } from '@/services/movimientos';

const NOMBRES_MES = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
];
// 3 columnas x 4 filas, en vez de una rueda con scroll: nada de física de
// gestos que ajustar a ciegas — es un Pressable con onPress, el mismo
// mecanismo que ya usan PillSelector/SelectField en el resto de la app.
const FILAS_MESES = [NOMBRES_MES.slice(0, 3), NOMBRES_MES.slice(3, 6), NOMBRES_MES.slice(6, 9), NOMBRES_MES.slice(9, 12)];
const MARGEN_ANIOS_ADELANTE = 2;

interface MonthYearPickerProps {
  anio: number;
  mes: number;
  onChange: (anio: number, mes: number) => void;
}

export function MonthYearPicker({ anio, mes, onChange }: MonthYearPickerProps) {
  const fecha = new Date(anio, mes - 1, 1);
  const etiqueta = capitalizar(format(fecha, 'MMMM yyyy', { locale: es }));

  const [sheetVisible, setSheetVisible] = useState(false);
  const [anioMasAntiguo, setAnioMasAntiguo] = useState<number | null>(null);

  useEffect(() => {
    fetchAnioMovimientoMasAntiguo()
      .then(setAnioMasAntiguo)
      .catch(() => setAnioMasAntiguo(null));
  }, []);

  function irMesAnterior() {
    const nueva = subMonths(fecha, 1);
    onChange(nueva.getFullYear(), nueva.getMonth() + 1);
  }

  function irMesSiguiente() {
    const nueva = addMonths(fecha, 1);
    onChange(nueva.getFullYear(), nueva.getMonth() + 1);
  }

  const anioActual = new Date().getFullYear();
  const anioMinimo = Math.min(anioMasAntiguo ?? anioActual, anio);
  const anioMaximo = Math.max(anioActual, anio) + MARGEN_ANIOS_ADELANTE;

  return (
    <>
      <View style={styles.container}>
        <Pressable onPress={irMesAnterior} style={styles.boton} hitSlop={8}>
          <Ionicons name="chevron-back" size={20} color={Colors.text} />
        </Pressable>
        <Pressable onPress={() => setSheetVisible(true)} hitSlop={8}>
          <Text style={styles.etiqueta}>{etiqueta}</Text>
        </Pressable>
        <Pressable onPress={irMesSiguiente} style={styles.boton} hitSlop={8}>
          <Ionicons name="chevron-forward" size={20} color={Colors.text} />
        </Pressable>
      </View>

      <MonthYearSheet
        visible={sheetVisible}
        anio={anio}
        mes={mes}
        anioMinimo={anioMinimo}
        anioMaximo={anioMaximo}
        onConfirmar={(nuevoAnio, nuevoMes) => {
          onChange(nuevoAnio, nuevoMes);
          setSheetVisible(false);
        }}
        onCerrar={() => setSheetVisible(false)}
      />
    </>
  );
}

function MonthYearSheet({
  visible,
  anio,
  mes,
  anioMinimo,
  anioMaximo,
  onConfirmar,
  onCerrar,
}: {
  visible: boolean;
  anio: number;
  mes: number;
  anioMinimo: number;
  anioMaximo: number;
  onConfirmar: (anio: number, mes: number) => void;
  onCerrar: () => void;
}) {
  const anios = useMemo(() => {
    const lista: number[] = [];
    for (let a = anioMinimo; a <= anioMaximo; a++) lista.push(a);
    return lista;
  }, [anioMinimo, anioMaximo]);

  const [mesElegido, setMesElegido] = useState(mes);
  const [anioElegido, setAnioElegido] = useState(anio);

  useEffect(() => {
    if (visible) {
      setMesElegido(mes);
      setAnioElegido(anio);
    }
  }, [visible, mes, anio]);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onCerrar}>
      <Pressable style={styles.backdrop} onPress={onCerrar}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <SafeAreaView edges={['bottom']}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitulo}>Elegí mes y año</Text>
              <Pressable onPress={onCerrar} hitSlop={12}>
                <Ionicons name="close" size={24} color={Colors.textSecondary} />
              </Pressable>
            </View>

            <View style={styles.seccion}>
              <Text style={styles.seccionLabel}>Mes</Text>
              <View style={styles.grillaMeses}>
                {FILAS_MESES.map((fila, filaIdx) => (
                  <View key={filaIdx} style={styles.filaGrilla}>
                    {fila.map((nombre, colIdx) => {
                      const numeroMes = filaIdx * 3 + colIdx + 1;
                      const seleccionado = numeroMes === mesElegido;
                      return (
                        <Pressable
                          key={nombre}
                          onPress={() => setMesElegido(numeroMes)}
                          style={[styles.chip, styles.chipGrilla, seleccionado && styles.chipSeleccionado]}
                        >
                          <Text style={[styles.chipTexto, seleccionado && styles.chipTextoSeleccionado]}>
                            {nombre}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                ))}
              </View>
            </View>

            <View style={styles.seccion}>
              <Text style={styles.seccionLabel}>Año</Text>
              <View style={styles.filaAnios}>
                {anios.map((a) => {
                  const seleccionado = a === anioElegido;
                  return (
                    <Pressable
                      key={a}
                      onPress={() => setAnioElegido(a)}
                      style={[styles.chip, styles.chipAnio, seleccionado && styles.chipSeleccionado]}
                    >
                      <Text style={[styles.chipTexto, seleccionado && styles.chipTextoSeleccionado]}>{a}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <View style={styles.sheetBotones}>
              <Button title="Confirmar" onPress={() => onConfirmar(anioElegido, mesElegido)} />
            </View>
          </SafeAreaView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
  },
  boton: {
    padding: Spacing.xs,
    borderRadius: Radius.full,
    backgroundColor: Colors.surface,
  },
  etiqueta: {
    color: Colors.text,
    fontSize: FontSize.md,
    fontWeight: '600',
    minWidth: 140,
    textAlign: 'center',
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: Radius.lg,
    borderTopRightRadius: Radius.lg,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  sheetTitulo: {
    color: Colors.text,
    fontSize: FontSize.lg,
    fontWeight: '700',
  },
  seccion: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  seccionLabel: {
    color: Colors.textSecondary,
    fontSize: FontSize.xs,
    textTransform: 'uppercase',
  },
  grillaMeses: {
    gap: Spacing.sm,
  },
  filaGrilla: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  filaAnios: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  chip: {
    paddingVertical: Spacing.sm + 2,
    paddingHorizontal: Spacing.sm,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipGrilla: {
    flex: 1,
  },
  chipAnio: {
    minWidth: 76,
  },
  chipSeleccionado: {
    borderColor: Colors.accent,
    backgroundColor: Colors.surface,
  },
  chipTexto: {
    color: Colors.text,
    fontSize: FontSize.sm,
  },
  chipTextoSeleccionado: {
    color: Colors.accent,
    fontWeight: '700',
  },
  sheetBotones: {
    padding: Spacing.lg,
  },
});
