import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { MovimientoForm } from '@/components/MovimientoForm';
import { Colors, FontSize, Spacing } from '@/constants/theme';
import { useCategorias } from '@/contexts/CategoriasContext';
import { traducirErrorDatos } from '@/services/errors';
import { actualizarMovimiento, fetchMovimiento } from '@/services/movimientos';
import type { Movimiento } from '@/types/database';

export default function EditarMovimientoScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { categorias } = useCategorias();

  const [movimiento, setMovimiento] = useState<Movimiento | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchMovimiento(id)
      .then(setMovimiento)
      .catch((err) => setError(traducirErrorDatos(err)))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={Colors.accent} />
      </View>
    );
  }

  if (error || !movimiento) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error ?? 'No se encontró el movimiento.'}</Text>
      </View>
    );
  }

  return (
    <MovimientoForm
      categorias={categorias}
      valoresIniciales={{
        tipo: movimiento.tipo,
        categoriaId: movimiento.categoria_id,
        monto: movimiento.monto,
        fecha: movimiento.fecha,
        descripcion: movimiento.descripcion ?? '',
        medioPago: movimiento.medio_pago,
      }}
      etiquetaBoton="Guardar cambios"
      onGuardar={async (datos) => {
        try {
          await actualizarMovimiento(id, {
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
        router.back();
      }}
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
