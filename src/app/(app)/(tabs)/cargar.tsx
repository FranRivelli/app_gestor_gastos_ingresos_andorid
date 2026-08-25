import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { MovimientoForm } from '@/components/MovimientoForm';
import { Colors, FontSize, Spacing } from '@/constants/theme';
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
      autoFocusMonto
    />
  );
}

const styles = StyleSheet.create({
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
});
