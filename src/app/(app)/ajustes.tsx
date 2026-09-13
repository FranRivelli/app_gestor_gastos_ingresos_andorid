import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CategoriaFormModal } from '@/components/CategoriaFormModal';
import { ResetearCuentaModal } from '@/components/ResetearCuentaModal';
import { Banner } from '@/components/ui/Banner';
import { Button } from '@/components/ui/Button';
import { Colors, FontSize, Radius, Spacing } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { useCategorias } from '@/contexts/CategoriasContext';
import { exportarMovimientosCSV } from '@/services/exportarCsv';
import type { Categoria } from '@/types/database';

export default function AjustesScreen() {
  const { session, signOut } = useAuth();
  const { categorias, refetch } = useCategorias();

  const [modalVisible, setModalVisible] = useState(false);
  const [categoriaEditando, setCategoriaEditando] = useState<Categoria | null>(null);
  const [exportando, setExportando] = useState(false);
  const [cerrandoSesion, setCerrandoSesion] = useState(false);
  const [resetModalVisible, setResetModalVisible] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mensajeExito, setMensajeExito] = useState<string | null>(null);

  const categoriasGasto = useMemo(() => categorias.filter((c) => c.tipo === 'gasto'), [categorias]);
  const categoriasIngreso = useMemo(() => categorias.filter((c) => c.tipo === 'ingreso'), [categorias]);

  function abrirNuevaCategoria() {
    setCategoriaEditando(null);
    setModalVisible(true);
  }

  function abrirEditarCategoria(categoria: Categoria) {
    setCategoriaEditando(categoria);
    setModalVisible(true);
  }

  async function handleExportarCSV() {
    setError(null);
    setExportando(true);
    try {
      await exportarMovimientosCSV();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ocurrió un error al exportar.');
    } finally {
      setExportando(false);
    }
  }

  async function handleSignOut() {
    setError(null);
    setCerrandoSesion(true);
    try {
      await signOut();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ocurrió un error. Intentá de nuevo.');
      setCerrandoSesion(false);
    }
  }

  function handleReseteado() {
    refetch();
    setMensajeExito('Tu cuenta se reseteó. Las categorías volvieron a las 23 por defecto.');
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.email}>{session?.user.email}</Text>

        {error ? <Banner message={error} /> : null}
        {mensajeExito ? <Banner message={mensajeExito} variant="success" /> : null}

        <View style={styles.seccion}>
          <View style={styles.seccionHeader}>
            <Text style={styles.seccionTitulo}>Categorías</Text>
            <Pressable onPress={abrirNuevaCategoria} style={styles.botonAgregar} hitSlop={8}>
              <Ionicons name="add" size={18} color={Colors.background} />
              <Text style={styles.botonAgregarTexto}>Nueva</Text>
            </Pressable>
          </View>

          <ListaCategorias titulo="Gastos" categorias={categoriasGasto} onEditar={abrirEditarCategoria} />
          <ListaCategorias titulo="Ingresos" categorias={categoriasIngreso} onEditar={abrirEditarCategoria} />
        </View>

        <View style={styles.seccion}>
          <Text style={styles.seccionTitulo}>Datos</Text>
          <Button title="Exportar movimientos a CSV" variant="secondary" onPress={handleExportarCSV} loading={exportando} />
        </View>

        <View style={styles.seccion}>
          <Button title="Cerrar sesión" variant="secondary" onPress={handleSignOut} loading={cerrandoSesion} />
        </View>

        <View style={styles.zonaPeligro}>
          <Text style={styles.zonaPeligroTitulo}>Zona de peligro</Text>
          <Text style={styles.zonaPeligroDescripcion}>
            Borra todos tus movimientos, presupuestos y reglas de categorización, y restaura las categorías a las
            23 por defecto. No se puede deshacer.
          </Text>
          <Pressable style={styles.botonResetear} onPress={() => setResetModalVisible(true)}>
            <Text style={styles.botonResetearTexto}>Resetear cuenta</Text>
          </Pressable>
        </View>
      </ScrollView>

      <CategoriaFormModal
        visible={modalVisible}
        categoria={categoriaEditando}
        onClose={() => setModalVisible(false)}
        onGuardado={refetch}
      />

      <ResetearCuentaModal
        visible={resetModalVisible}
        onClose={() => setResetModalVisible(false)}
        onReseteado={handleReseteado}
      />
    </SafeAreaView>
  );
}

function ListaCategorias({
  titulo,
  categorias,
  onEditar,
}: {
  titulo: string;
  categorias: Categoria[];
  onEditar: (categoria: Categoria) => void;
}) {
  if (categorias.length === 0) return null;

  return (
    <View style={styles.grupo}>
      <Text style={styles.grupoTitulo}>{titulo}</Text>
      {categorias.map((c) => (
        <Pressable key={c.id} style={styles.fila} onPress={() => onEditar(c)}>
          <View style={[styles.dot, { backgroundColor: c.color }, !c.activa && styles.dotInactiva]} />
          <Text style={[styles.filaNombre, !c.activa && styles.textoInactivo]} numberOfLines={1}>
            {c.nombre}
            {!c.activa ? ' (inactiva)' : ''}
          </Text>
          <Ionicons name="chevron-forward" size={18} color={Colors.textSecondary} />
        </Pressable>
      ))}
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
    gap: Spacing.xl,
    paddingBottom: Spacing.xxl,
  },
  email: {
    color: Colors.text,
    fontSize: FontSize.lg,
    fontWeight: '700',
  },
  seccion: {
    gap: Spacing.md,
  },
  seccionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  seccionTitulo: {
    color: Colors.text,
    fontSize: FontSize.md,
    fontWeight: '700',
  },
  botonAgregar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.accent,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    borderRadius: Radius.full,
  },
  botonAgregarTexto: {
    color: Colors.background,
    fontSize: FontSize.sm,
    fontWeight: '600',
  },
  grupo: {
    gap: Spacing.xs,
  },
  grupoTitulo: {
    color: Colors.textSecondary,
    fontSize: FontSize.xs,
    textTransform: 'uppercase',
    marginTop: Spacing.xs,
  },
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  dotInactiva: {
    opacity: 0.35,
  },
  filaNombre: {
    flex: 1,
    color: Colors.text,
    fontSize: FontSize.md,
  },
  textoInactivo: {
    color: Colors.textSecondary,
  },
  zonaPeligro: {
    marginTop: Spacing.md,
    paddingTop: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: Colors.expense,
    gap: Spacing.sm,
  },
  zonaPeligroTitulo: {
    color: Colors.expense,
    fontSize: FontSize.md,
    fontWeight: '700',
  },
  zonaPeligroDescripcion: {
    color: Colors.textSecondary,
    fontSize: FontSize.sm,
  },
  botonResetear: {
    borderWidth: 1,
    borderColor: Colors.expense,
    borderRadius: Radius.md,
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  botonResetearTexto: {
    color: Colors.expense,
    fontSize: FontSize.md,
    fontWeight: '600',
  },
});
