import { Ionicons } from '@expo/vector-icons';
import { addMonths, format, subMonths } from 'date-fns';
import { es } from 'date-fns/locale';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Colors, FontSize, Radius, Spacing } from '@/constants/theme';
import { capitalizar } from '@/lib/format';

interface MonthYearPickerProps {
  anio: number;
  mes: number;
  onChange: (anio: number, mes: number) => void;
}

export function MonthYearPicker({ anio, mes, onChange }: MonthYearPickerProps) {
  const fecha = new Date(anio, mes - 1, 1);
  const etiqueta = capitalizar(format(fecha, 'MMMM yyyy', { locale: es }));

  function irMesAnterior() {
    const nueva = subMonths(fecha, 1);
    onChange(nueva.getFullYear(), nueva.getMonth() + 1);
  }

  function irMesSiguiente() {
    const nueva = addMonths(fecha, 1);
    onChange(nueva.getFullYear(), nueva.getMonth() + 1);
  }

  return (
    <View style={styles.container}>
      <Pressable onPress={irMesAnterior} style={styles.boton} hitSlop={8}>
        <Ionicons name="chevron-back" size={20} color={Colors.text} />
      </Pressable>
      <Text style={styles.etiqueta}>{etiqueta}</Text>
      <Pressable onPress={irMesSiguiente} style={styles.boton} hitSlop={8}>
        <Ionicons name="chevron-forward" size={20} color={Colors.text} />
      </Pressable>
    </View>
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
});
