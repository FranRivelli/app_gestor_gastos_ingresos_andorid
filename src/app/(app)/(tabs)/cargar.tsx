import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { MovimientoForm } from '@/components/MovimientoForm';
import { Colors, FontSize, Radius, Spacing } from '@/constants/theme';
import { useCategorias } from '@/contexts/CategoriasContext';
import { traducirErrorDatos } from '@/services/errors';
import { crearMovimiento } from '@/services/movimientos';

export default function CargarScreen() {
  const { categorias, loading, error } = useCategorias();

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={Colors.accent} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Pressable style={styles.importarLink} onPress={() => router.push('/importar-mp')} hitSlop={8}>
        <Ionicons name="document-text-outline" size={16} color={Colors.accent} />
        <Text style={styles.importarLinkTexto}>Importar resumen de Mercado Pago</Text>
        <Ionicons name="chevron-forward" size={16} color={Colors.accent} />
      </Pressable>

      <MovimientoForm
        categorias={categorias}
        onGuardar={async (datos) => {
          try {
            await crearMovimiento({
              tipo: datos.tipo,
              categoria_id: datos.categoriaId,
              monto: datos.monto,
              fecha: datos.fecha,
              descripcion: datos.descripcion,
              medio_pago: datos.medioPago,
            });
          } catch (err) {
            throw new Error(traducirErrorDatos(err));
          }
        }}
        etiquetaBoton="Guardar"
        limpiarAlGuardar
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  centered: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
  },
  errorText: {
    color: Colors.expense,
    fontSize: FontSize.md,
    textAlign: 'center',
  },
  importarLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    marginTop: Spacing.lg,
  },
  importarLinkTexto: {
    color: Colors.accent,
    fontSize: FontSize.sm,
    fontWeight: '600',
  },
});
