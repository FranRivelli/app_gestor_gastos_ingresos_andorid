import { StyleSheet, Text, View } from 'react-native';

import { Colors, FontSize, Spacing } from '@/constants/theme';

// Placeholder temporal: la Fase 5 reemplaza esta pantalla por la definición
// de presupuestos por categoría y el seguimiento de lo gastado.
export default function PresupuestoScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Presupuesto</Text>
      <Text style={styles.subtitle}>La definición de presupuestos por categoría llega en una próxima fase.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
    gap: Spacing.sm,
  },
  title: {
    color: Colors.text,
    fontSize: FontSize.xl,
    fontWeight: '700',
  },
  subtitle: {
    color: Colors.textSecondary,
    fontSize: FontSize.md,
    textAlign: 'center',
  },
});
