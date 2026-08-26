import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { COLORES_CATEGORIA } from '@/constants/categoriaColores';
import { Colors, FontSize, Spacing } from '@/constants/theme';

interface ColorSwatchPickerProps {
  label: string;
  value: string;
  onChange: (color: string) => void;
}

export function ColorSwatchPicker({ label, value, onChange }: ColorSwatchPickerProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.grid}>
        {COLORES_CATEGORIA.map((color) => {
          const seleccionado = color.toUpperCase() === value.toUpperCase();
          return (
            <Pressable
              key={color}
              onPress={() => onChange(color)}
              style={[styles.swatch, { backgroundColor: color }, seleccionado && styles.swatchSeleccionado]}
            >
              {seleccionado ? <Ionicons name="checkmark" size={16} color="#12151C" /> : null}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.xs,
  },
  label: {
    color: Colors.textSecondary,
    fontSize: FontSize.sm,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  swatch: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  swatchSeleccionado: {
    borderWidth: 2,
    borderColor: Colors.text,
  },
});
