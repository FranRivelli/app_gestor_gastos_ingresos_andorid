import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Colors, FontSize, Radius, Spacing } from '@/constants/theme';

interface SnackbarProps {
  visible: boolean;
  mensaje: string;
  accionTexto?: string;
  onAccion: () => void;
}

// Puramente presentacional: no maneja su propio timer. Quien lo usa decide
// cuándo mostrarlo/ocultarlo, para que ese mismo reloj controle también
// cuándo se efectiviza la acción diferida (por ejemplo un borrado real).
export function Snackbar({ visible, mensaje, accionTexto = 'Deshacer', onAccion }: SnackbarProps) {
  if (!visible) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.mensaje} numberOfLines={2}>
        {mensaje}
      </Text>
      <Pressable onPress={onAccion} hitSlop={8}>
        <Text style={styles.accion}>{accionTexto}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: Spacing.lg,
    right: Spacing.lg,
    bottom: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.md,
    backgroundColor: Colors.surfaceAlt,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 6,
  },
  mensaje: {
    flex: 1,
    color: Colors.text,
    fontSize: FontSize.sm,
  },
  accion: {
    color: Colors.accent,
    fontSize: FontSize.sm,
    fontWeight: '700',
  },
});
