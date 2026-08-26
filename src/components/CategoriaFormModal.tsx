import { useEffect, useState } from 'react';
import { Alert, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Banner } from '@/components/ui/Banner';
import { Button } from '@/components/ui/Button';
import { PillSelector } from '@/components/ui/PillSelector';
import { TextField } from '@/components/ui/TextField';
import { ColorSwatchPicker } from '@/components/ColorSwatchPicker';
import { COLORES_CATEGORIA } from '@/constants/categoriaColores';
import { OPCIONES_TIPO } from '@/constants/opciones';
import { Colors, FontSize, Radius, Spacing } from '@/constants/theme';
import {
  CategoriaConMovimientosError,
  actualizarCategoria,
  crearCategoria,
  eliminarCategoria,
} from '@/services/categorias';
import { traducirErrorDatos } from '@/services/errors';
import type { Categoria, NaturalezaCategoria, TipoMovimiento } from '@/types/database';

const OPCIONES_NATURALEZA: { value: NaturalezaCategoria; label: string }[] = [
  { value: 'fijo', label: 'Fijo' },
  { value: 'variable', label: 'Variable' },
];

interface CategoriaFormModalProps {
  visible: boolean;
  categoria: Categoria | null;
  onClose: () => void;
  onGuardado: () => void;
}

export function CategoriaFormModal({ visible, categoria, onClose, onGuardado }: CategoriaFormModalProps) {
  const esEdicion = categoria !== null;

  const [nombre, setNombre] = useState('');
  const [tipo, setTipo] = useState<TipoMovimiento>('gasto');
  const [naturaleza, setNaturaleza] = useState<NaturalezaCategoria>('variable');
  const [color, setColor] = useState(COLORES_CATEGORIA[0]);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    setError(null);
    if (categoria) {
      setNombre(categoria.nombre);
      setTipo(categoria.tipo);
      setNaturaleza(categoria.naturaleza);
      setColor(categoria.color);
    } else {
      setNombre('');
      setTipo('gasto');
      setNaturaleza('variable');
      setColor(COLORES_CATEGORIA[0]);
    }
  }, [visible, categoria]);

  async function handleGuardar() {
    const nombreLimpio = nombre.trim();
    if (!nombreLimpio) {
      setError('Ingresá un nombre para la categoría.');
      return;
    }

    setError(null);
    setGuardando(true);
    try {
      if (categoria) {
        await actualizarCategoria(categoria.id, { nombre: nombreLimpio, naturaleza, color });
      } else {
        await crearCategoria({ nombre: nombreLimpio, tipo, naturaleza, color });
      }
      onGuardado();
      onClose();
    } catch (err) {
      setError(traducirErrorDatos(err));
    } finally {
      setGuardando(false);
    }
  }

  async function handleDesactivar() {
    if (!categoria) return;
    setError(null);
    setGuardando(true);
    try {
      await actualizarCategoria(categoria.id, { activa: !categoria.activa });
      onGuardado();
      onClose();
    } catch (err) {
      setError(traducirErrorDatos(err));
    } finally {
      setGuardando(false);
    }
  }

  function handleEliminar() {
    if (!categoria) return;
    Alert.alert('Eliminar categoría', `¿Seguro que querés eliminar "${categoria.nombre}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          setGuardando(true);
          try {
            await eliminarCategoria(categoria.id);
            onGuardado();
            onClose();
          } catch (err) {
            if (err instanceof CategoriaConMovimientosError) {
              setGuardando(false);
              Alert.alert(
                'No se puede eliminar',
                'Esta categoría tiene movimientos asociados. ¿Querés desactivarla en su lugar? Así deja de aparecer para cargar movimientos nuevos, pero los que ya tenés no se tocan.',
                [
                  { text: 'Cancelar', style: 'cancel' },
                  { text: 'Desactivar', onPress: handleDesactivar },
                ]
              );
              return;
            }
            setError(traducirErrorDatos(err));
          } finally {
            setGuardando(false);
          }
        },
      },
    ]);
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
              <Text style={styles.titulo}>{esEdicion ? 'Editar categoría' : 'Nueva categoría'}</Text>

              {error ? <Banner message={error} /> : null}

              <TextField label="Nombre" value={nombre} onChangeText={setNombre} placeholder="Ej: Gimnasio" />

              {esEdicion ? (
                <View style={styles.tipoFijo}>
                  <Text style={styles.tipoFijoLabel}>Tipo</Text>
                  <Text style={styles.tipoFijoValor}>{tipo === 'ingreso' ? 'Ingreso' : 'Gasto'}</Text>
                </View>
              ) : (
                <PillSelector label="Tipo" value={tipo} options={OPCIONES_TIPO} onChange={setTipo} />
              )}

              <PillSelector
                label="Naturaleza"
                value={naturaleza}
                options={OPCIONES_NATURALEZA}
                onChange={setNaturaleza}
              />

              <ColorSwatchPicker label="Color" value={color} onChange={setColor} />

              <Button title="Guardar" onPress={handleGuardar} loading={guardando} />

              {esEdicion ? (
                <View style={styles.accionesSecundarias}>
                  <Button
                    title={categoria?.activa ? 'Desactivar categoría' : 'Reactivar categoría'}
                    variant="secondary"
                    onPress={handleDesactivar}
                    loading={guardando}
                  />
                  <Button title="Eliminar categoría" variant="secondary" onPress={handleEliminar} loading={guardando} />
                </View>
              ) : null}
            </ScrollView>
          </KeyboardAvoidingView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: Radius.lg,
    borderTopRightRadius: Radius.lg,
    maxHeight: '85%',
  },
  content: {
    padding: Spacing.lg,
    gap: Spacing.lg,
  },
  titulo: {
    color: Colors.text,
    fontSize: FontSize.lg,
    fontWeight: '700',
  },
  tipoFijo: {
    gap: Spacing.xs,
  },
  tipoFijoLabel: {
    color: Colors.textSecondary,
    fontSize: FontSize.sm,
  },
  tipoFijoValor: {
    color: Colors.text,
    fontSize: FontSize.md,
  },
  accionesSecundarias: {
    gap: Spacing.sm,
  },
});
