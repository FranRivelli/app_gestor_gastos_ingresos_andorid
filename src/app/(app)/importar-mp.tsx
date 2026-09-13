import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { File } from 'expo-file-system';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  Platform,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Banner } from '@/components/ui/Banner';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/TextField';
import { Colors, FontSize, Radius, Spacing } from '@/constants/theme';
import { useCategorias } from '@/contexts/CategoriasContext';
import { useDashboardPeriod } from '@/contexts/DashboardPeriodContext';
import { formatFecha, formatMonto } from '@/lib/format';
import { traducirErrorDatos } from '@/services/errors';
import {
  construirVistaPrevia,
  guardarImportacionMp,
  invocarParseoMp,
  type FilaImportacion,
  type MovimientoParseadoMp,
  type ResumenParseoMp,
} from '@/services/importarMp';
import { fetchReglasCategorizacion, guardarReglaCategorizacion } from '@/services/reglasCategorizacion';
import type { Categoria, ReglaCategorizacion } from '@/types/database';

export default function ImportarMpScreen() {
  const { categorias, loading: categoriasLoading } = useCategorias();
  const { setPeriodo } = useDashboardPeriod();

  const [reglas, setReglas] = useState<ReglaCategorizacion[]>([]);
  const [movimientosCrudo, setMovimientosCrudo] = useState<MovimientoParseadoMp[] | null>(null);
  const [resumenParseo, setResumenParseo] = useState<ResumenParseoMp | null>(null);
  const [filas, setFilas] = useState<FilaImportacion[]>([]);
  const [consolidarRendimientos, setConsolidarRendimientos] = useState(false);

  const [cargandoArchivo, setCargandoArchivo] = useState(false);
  const [cargandoVistaPrevia, setCargandoVistaPrevia] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mensajeExito, setMensajeExito] = useState<string | null>(null);

  const [filaParaCategoria, setFilaParaCategoria] = useState<FilaImportacion | null>(null);
  const [filaParaRegla, setFilaParaRegla] = useState<FilaImportacion | null>(null);
  const [patronDraft, setPatronDraft] = useState('');
  const [categoriaReglaId, setCategoriaReglaId] = useState<string | null>(null);
  const [eligiendoCategoriaRegla, setEligiendoCategoriaRegla] = useState(false);
  const [guardandoRegla, setGuardandoRegla] = useState(false);
  const [footerVisible, setFooterVisible] = useState(false);
  const fabAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.timing(fabAnim, {
      toValue: footerVisible ? 0 : 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [footerVisible, fabAnim]);

  function handleScroll(event: NativeSyntheticEvent<NativeScrollEvent>) {
    const { contentOffset, layoutMeasurement, contentSize } = event.nativeEvent;
    const distanciaAlFinal = contentSize.height - (contentOffset.y + layoutMeasurement.height);
    setFooterVisible(distanciaAlFinal < 120);
  }

  useEffect(() => {
    fetchReglasCategorizacion()
      .then(setReglas)
      .catch(() => setError('No se pudieron cargar las reglas de categorización guardadas.'));
  }, []);

  // Recalcula la previsualización cuando cambia el toggle de consolidación,
  // las categorías o las reglas — sin volver a llamar a la función (el PDF
  // ya se parseó una sola vez y se cachea en movimientosCrudo).
  useEffect(() => {
    if (!movimientosCrudo || categoriasLoading) return;
    let cancelado = false;
    setCargandoVistaPrevia(true);
    construirVistaPrevia(movimientosCrudo, categorias, reglas, consolidarRendimientos)
      .then((nuevasFilas) => {
        if (!cancelado) setFilas(nuevasFilas);
      })
      .catch((err) => {
        if (!cancelado) setError(err instanceof Error ? err.message : 'No se pudo armar la previsualización.');
      })
      .finally(() => {
        if (!cancelado) setCargandoVistaPrevia(false);
      });
    return () => {
      cancelado = true;
    };
  }, [movimientosCrudo, categorias, categoriasLoading, reglas, consolidarRendimientos]);

  const categoriaPorId = useMemo(() => new Map(categorias.map((c) => [c.id, c])), [categorias]);
  const cantidadSeleccionadas = filas.filter((f) => f.seleccionada && !f.yaImportada).length;

  async function handleElegirArchivo() {
    setError(null);
    setMensajeExito(null);

    let resultado;
    try {
      resultado = await File.pickFileAsync({ mimeTypes: 'application/pdf' });
    } catch {
      setError('No se pudo abrir el selector de archivos.');
      return;
    }
    if (resultado.canceled) return;

    setCargandoArchivo(true);
    try {
      const { movimientosCrudo: crudo, resumen } = await invocarParseoMp(resultado.result);
      setMovimientosCrudo(crudo);
      setResumenParseo(resumen);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo procesar el PDF.');
      setMovimientosCrudo(null);
      setResumenParseo(null);
    } finally {
      setCargandoArchivo(false);
    }
  }

  function toggleFila(idExterno: string) {
    setFilas((prev) =>
      prev.map((f) => (f.idExterno === idExterno ? { ...f, seleccionada: !f.seleccionada } : f))
    );
  }

  function cambiarCategoriaFila(idExterno: string, categoriaId: string) {
    setFilas((prev) => prev.map((f) => (f.idExterno === idExterno ? { ...f, categoriaId } : f)));
  }

  // Mes con más filas guardadas en esta tanda — si el PDF cruza dos meses,
  // el usuario quiere terminar viendo el que concentra la mayoría de los
  // movimientos, no necesariamente el mes calendario actual.
  function mesDominante(filasGuardadas: FilaImportacion[]): { anio: number; mes: number } | null {
    const porMes = new Map<string, number>();
    for (const f of filasGuardadas) {
      const clave = f.fecha.slice(0, 7);
      porMes.set(clave, (porMes.get(clave) ?? 0) + 1);
    }
    let claveGanadora: string | null = null;
    let maxCantidad = 0;
    for (const [clave, cantidad] of porMes) {
      if (cantidad > maxCantidad) {
        maxCantidad = cantidad;
        claveGanadora = clave;
      }
    }
    if (!claveGanadora) return null;
    const [anio, mes] = claveGanadora.split('-').map(Number);
    return { anio, mes };
  }

  async function handleGuardar() {
    setError(null);
    setMensajeExito(null);
    setGuardando(true);
    try {
      const guardadas = filas.filter((f) => f.seleccionada && !f.yaImportada);
      const cantidad = await guardarImportacionMp(filas);

      if (cantidad > 0) {
        const destino = mesDominante(guardadas);
        if (destino) setPeriodo(destino.anio, destino.mes);
        router.replace('/');
        return;
      }

      setMensajeExito('No había filas seleccionadas para importar.');
      if (movimientosCrudo) {
        const actualizadas = await construirVistaPrevia(movimientosCrudo, categorias, reglas, consolidarRendimientos);
        setFilas(actualizadas);
      }
    } catch (err) {
      setError(traducirErrorDatos(err));
    } finally {
      setGuardando(false);
    }
  }

  function abrirCrearRegla(fila: FilaImportacion) {
    setFilaParaRegla(fila);
    setPatronDraft(fila.descripcion);
    setCategoriaReglaId(fila.categoriaId);
  }

  async function confirmarRegla() {
    if (!filaParaRegla || !patronDraft.trim() || !categoriaReglaId) return;
    setGuardandoRegla(true);
    try {
      await guardarReglaCategorizacion(patronDraft.trim(), categoriaReglaId);
      const nuevasReglas = await fetchReglasCategorizacion();
      setReglas(nuevasReglas);
      setFilaParaRegla(null);
    } catch (err) {
      setError(traducirErrorDatos(err));
    } finally {
      setGuardandoRegla(false);
    }
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <FlatList
        contentContainerStyle={styles.content}
        data={filas}
        keyExtractor={(f) => f.idExterno}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        ListHeaderComponent={
          <View style={styles.header}>
            {error ? <Banner message={error} /> : null}
            {mensajeExito ? <Banner message={mensajeExito} variant="success" /> : null}

            <Button
              title={movimientosCrudo ? 'Elegir otro PDF' : 'Elegir PDF de Mercado Pago'}
              onPress={handleElegirArchivo}
              loading={cargandoArchivo}
              variant={movimientosCrudo ? 'secondary' : 'primary'}
            />

            {resumenParseo ? (
              <View style={styles.resumenBox}>
                <Text style={styles.resumenTitulo}>Según el PDF</Text>
                <Text style={styles.resumenLinea}>{resumenParseo.cantidadFilas} filas parseadas</Text>
                <Text style={styles.resumenLinea}>Entradas: {formatMonto(resumenParseo.entradas)}</Text>
                <Text style={styles.resumenLinea}>Salidas: {formatMonto(resumenParseo.salidas)}</Text>
                <Text style={styles.resumenAyuda}>Compará estos totales contra el resumen del PDF.</Text>
                {resumenParseo.filasSinParsear.length > 0 ? (
                  <Text style={[styles.resumenLinea, styles.resumenAlerta]}>
                    {resumenParseo.filasSinParsear.length} línea(s) del PDF no se pudieron interpretar y no están
                    en la lista de abajo. Revisalas a mano en el PDF.
                  </Text>
                ) : null}
              </View>
            ) : null}

            {movimientosCrudo ? (
              <View style={styles.toggleFila}>
                <Text style={styles.toggleTexto}>Importar rendimientos consolidados por mes</Text>
                <Switch
                  value={consolidarRendimientos}
                  onValueChange={setConsolidarRendimientos}
                  trackColor={{ true: Colors.accent, false: Colors.border }}
                  thumbColor={Colors.text}
                />
              </View>
            ) : null}

            {cargandoVistaPrevia ? <ActivityIndicator color={Colors.accent} style={styles.spinner} /> : null}
          </View>
        }
        renderItem={({ item }) => (
          <FilaImportacionRow
            fila={item}
            categoria={categoriaPorId.get(item.categoriaId)}
            onToggle={() => toggleFila(item.idExterno)}
            onAbrirCategoria={() => setFilaParaCategoria(item)}
            onCrearRegla={() => abrirCrearRegla(item)}
          />
        )}
        ListEmptyComponent={
          !cargandoArchivo && !cargandoVistaPrevia && movimientosCrudo ? (
            <Text style={styles.vacioTexto}>No se encontraron movimientos en el PDF.</Text>
          ) : null
        }
        ListFooterComponent={
          filas.length > 0 ? (
            <Button
              title={`Guardar ${cantidadSeleccionadas} movimiento${cantidadSeleccionadas === 1 ? '' : 's'}`}
              onPress={handleGuardar}
              loading={guardando}
              disabled={cantidadSeleccionadas === 0}
              style={styles.botonGuardar}
            />
          ) : null
        }
      />

      <CategoriaPickerModal
        visible={filaParaCategoria !== null}
        categorias={categorias.filter((c) => c.activa && c.tipo === filaParaCategoria?.tipo)}
        valor={filaParaCategoria?.categoriaId ?? null}
        onSeleccionar={(id) => {
          if (filaParaCategoria) cambiarCategoriaFila(filaParaCategoria.idExterno, id);
          setFilaParaCategoria(null);
        }}
        onCerrar={() => setFilaParaCategoria(null)}
      />

      <Modal
        visible={filaParaRegla !== null}
        animationType="slide"
        transparent
        onRequestClose={() => setFilaParaRegla(null)}
      >
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <Pressable style={styles.backdrop} onPress={() => setFilaParaRegla(null)}>
            <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
              <SafeAreaView edges={['bottom']} style={styles.sheetContent}>
                <Text style={styles.reglaTitulo}>Recordar categoría</Text>
                <Text style={styles.sheetSubtitulo}>
                  Las próximas importaciones van a sugerir la categoría elegida abajo para las filas cuya
                  descripción contenga este texto.
                </Text>
                <TextField
                  label="Texto a buscar en la descripción"
                  value={patronDraft}
                  onChangeText={setPatronDraft}
                  autoCapitalize="none"
                />
                <View style={styles.campoCategoriaRegla}>
                  <Text style={styles.label}>Categoría</Text>
                  <Pressable onPress={() => setEligiendoCategoriaRegla(true)} style={styles.categoriaChip}>
                    <View
                      style={[
                        styles.dot,
                        { backgroundColor: categoriaPorId.get(categoriaReglaId ?? '')?.color ?? Colors.border },
                      ]}
                    />
                    <Text style={styles.categoriaTexto}>
                      {categoriaPorId.get(categoriaReglaId ?? '')?.nombre ?? 'Elegir categoría'}
                    </Text>
                    <Ionicons name="chevron-down" size={14} color={Colors.textSecondary} />
                  </Pressable>
                </View>
                <Button
                  title="Guardar regla"
                  onPress={confirmarRegla}
                  loading={guardandoRegla}
                  disabled={!patronDraft.trim() || !categoriaReglaId}
                />
              </SafeAreaView>
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>

      <CategoriaPickerModal
        visible={eligiendoCategoriaRegla}
        categorias={categorias.filter((c) => c.activa && c.tipo === filaParaRegla?.tipo)}
        valor={categoriaReglaId}
        onSeleccionar={(id) => {
          setCategoriaReglaId(id);
          setEligiendoCategoriaRegla(false);
        }}
        onCerrar={() => setEligiendoCategoriaRegla(false)}
      />

      {cantidadSeleccionadas > 0 ? (
        <Animated.View
          pointerEvents={footerVisible ? 'none' : 'auto'}
          style={[styles.fab, { opacity: fabAnim, transform: [{ scale: fabAnim }] }]}
        >
          <Pressable
            onPress={handleGuardar}
            disabled={guardando}
            style={({ pressed }) => [styles.fabPressable, pressed && styles.fabPresionado]}
          >
            {guardando ? (
              <ActivityIndicator color={Colors.background} />
            ) : (
              <Ionicons name="checkmark" size={28} color={Colors.background} />
            )}
          </Pressable>
        </Animated.View>
      ) : null}
    </SafeAreaView>
  );
}

function FilaImportacionRow({
  fila,
  categoria,
  onToggle,
  onAbrirCategoria,
  onCrearRegla,
}: {
  fila: FilaImportacion;
  categoria: Categoria | undefined;
  onToggle: () => void;
  onAbrirCategoria: () => void;
  onCrearRegla: () => void;
}) {
  const deshabilitada = fila.yaImportada;

  return (
    <View style={[styles.fila, deshabilitada && styles.filaDeshabilitada]}>
      <Pressable onPress={onToggle} disabled={deshabilitada} hitSlop={8}>
        <Ionicons
          name={fila.seleccionada ? 'checkbox' : 'square-outline'}
          size={22}
          color={deshabilitada ? Colors.textSecondary : fila.seleccionada ? Colors.accent : Colors.textSecondary}
        />
      </Pressable>

      <View style={styles.filaInfo}>
        <View style={styles.filaEncabezado}>
          <Text style={styles.filaFecha}>{formatFecha(fila.fecha)}</Text>
          {fila.yaImportada ? <Etiqueta texto="Ya importado" color={Colors.textSecondary} /> : null}
          {fila.esConsolidado ? <Etiqueta texto="Consolidado" color={Colors.accent} /> : null}
          {fila.requiereConfirmacion && !fila.yaImportada ? (
            <Etiqueta texto="Confirmar" color={Colors.warning} />
          ) : null}
        </View>
        <Text style={styles.filaDescripcion} numberOfLines={2}>
          {fila.descripcion}
        </Text>
        <Pressable onPress={onAbrirCategoria} disabled={deshabilitada} style={styles.categoriaChip}>
          <View style={[styles.dot, { backgroundColor: categoria?.color ?? Colors.border }]} />
          <Text style={styles.categoriaTexto} numberOfLines={1}>
            {categoria?.nombre ?? 'Elegir categoría'}
          </Text>
          {!deshabilitada ? <Ionicons name="chevron-down" size={14} color={Colors.textSecondary} /> : null}
        </Pressable>
      </View>

      <View style={styles.filaLateral}>
        <Text style={[styles.filaMonto, { color: fila.tipo === 'gasto' ? Colors.expense : Colors.income }]}>
          {formatMonto(fila.tipo === 'gasto' ? -fila.monto : fila.monto)}
        </Text>
        {!fila.esConsolidado && !deshabilitada ? (
          <Pressable onPress={onCrearRegla} hitSlop={8} style={styles.botonRegla}>
            <Ionicons name="bookmark-outline" size={18} color={Colors.textSecondary} />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

function Etiqueta({ texto, color }: { texto: string; color: string }) {
  return (
    <View style={[styles.etiqueta, { borderColor: color }]}>
      <Text style={[styles.etiquetaTexto, { color }]}>{texto}</Text>
    </View>
  );
}

function CategoriaPickerModal({
  visible,
  categorias,
  valor,
  onSeleccionar,
  onCerrar,
}: {
  visible: boolean;
  categorias: Categoria[];
  valor: string | null;
  onSeleccionar: (id: string) => void;
  onCerrar: () => void;
}) {
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onCerrar}>
      <Pressable style={styles.backdrop} onPress={onCerrar}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <SafeAreaView edges={['bottom']}>
            <Text style={styles.sheetTitle}>Categoría</Text>
            <FlatList
              data={categorias}
              keyExtractor={(c) => c.id}
              style={styles.list}
              renderItem={({ item }) => (
                <Pressable style={styles.option} onPress={() => onSeleccionar(item.id)}>
                  <View style={[styles.dot, { backgroundColor: item.color }]} />
                  <Text style={styles.optionText}>{item.nombre}</Text>
                  {item.id === valor ? <Ionicons name="checkmark" size={18} color={Colors.accent} /> : null}
                </Pressable>
              )}
            />
          </SafeAreaView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  flex: {
    flex: 1,
  },
  content: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xxl,
  },
  header: {
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  spinner: {
    marginTop: Spacing.sm,
  },
  resumenBox: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    padding: Spacing.md,
    gap: 2,
  },
  resumenTitulo: {
    color: Colors.textSecondary,
    fontSize: FontSize.xs,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  resumenLinea: {
    color: Colors.text,
    fontSize: FontSize.sm,
  },
  resumenAyuda: {
    color: Colors.textSecondary,
    fontSize: FontSize.xs,
    marginTop: 4,
  },
  resumenAlerta: {
    color: Colors.warning,
    marginTop: 4,
  },
  toggleFila: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  toggleTexto: {
    color: Colors.text,
    fontSize: FontSize.sm,
    flex: 1,
    marginRight: Spacing.sm,
  },
  vacioTexto: {
    color: Colors.textSecondary,
    fontSize: FontSize.md,
    textAlign: 'center',
    marginTop: Spacing.xl,
  },
  botonGuardar: {
    marginTop: Spacing.lg,
  },
  fab: {
    position: 'absolute',
    right: Spacing.lg,
    bottom: Spacing.lg,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.accent,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 6,
  },
  fabPressable: {
    flex: 1,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fabPresionado: {
    opacity: 0.85,
  },
  fila: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  filaDeshabilitada: {
    opacity: 0.5,
  },
  filaInfo: {
    flex: 1,
    gap: 4,
  },
  filaEncabezado: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  filaFecha: {
    color: Colors.textSecondary,
    fontSize: FontSize.xs,
  },
  filaDescripcion: {
    color: Colors.text,
    fontSize: FontSize.sm,
  },
  categoriaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    backgroundColor: Colors.surfaceAlt,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    marginTop: 2,
  },
  categoriaTexto: {
    color: Colors.text,
    fontSize: FontSize.xs,
    maxWidth: 160,
  },
  filaLateral: {
    alignItems: 'flex-end',
    gap: Spacing.sm,
  },
  filaMonto: {
    fontSize: FontSize.sm,
    fontWeight: '700',
  },
  botonRegla: {
    padding: 2,
  },
  etiqueta: {
    borderWidth: 1,
    borderRadius: Radius.full,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  etiquetaTexto: {
    fontSize: 10,
    fontWeight: '600',
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
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
    maxHeight: '70%',
  },
  sheetContent: {
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  reglaTitulo: {
    color: Colors.text,
    fontSize: FontSize.lg,
    fontWeight: '700',
  },
  campoCategoriaRegla: {
    gap: Spacing.xs,
  },
  label: {
    color: Colors.textSecondary,
    fontSize: FontSize.sm,
  },
  sheetTitle: {
    color: Colors.text,
    fontSize: FontSize.lg,
    fontWeight: '700',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.sm,
  },
  sheetSubtitulo: {
    color: Colors.textSecondary,
    fontSize: FontSize.sm,
  },
  list: {
    paddingHorizontal: Spacing.md,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  optionText: {
    color: Colors.text,
    fontSize: FontSize.md,
    flex: 1,
  },
});
