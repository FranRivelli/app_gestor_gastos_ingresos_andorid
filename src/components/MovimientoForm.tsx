import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { parseISO } from 'date-fns';
import * as Haptics from 'expo-haptics';
import { useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { Banner } from '@/components/ui/Banner';
import { Button } from '@/components/ui/Button';
import { PillSelector } from '@/components/ui/PillSelector';
import { SelectField } from '@/components/ui/SelectField';
import { TextField } from '@/components/ui/TextField';
import { OPCIONES_MEDIO_PAGO, OPCIONES_TIPO } from '@/constants/opciones';
import { Colors, FontSize, Radius, Spacing } from '@/constants/theme';
import { fechaDeHoy, formatFecha } from '@/lib/format';
import type { Categoria, MedioPago, TipoMovimiento } from '@/types/database';

export interface DatosMovimientoForm {
  tipo: TipoMovimiento;
  categoriaId: string;
  monto: number;
  fecha: string;
  descripcion: string | null;
  medioPago: MedioPago;
}

interface ValoresIniciales {
  tipo: TipoMovimiento;
  categoriaId: string;
  monto: number;
  fecha: string;
  descripcion: string;
  medioPago: MedioPago;
}

interface MovimientoFormProps {
  categorias: Categoria[];
  valoresIniciales?: ValoresIniciales;
  onGuardar: (datos: DatosMovimientoForm) => Promise<void>;
  etiquetaBoton: string;
  limpiarAlGuardar?: boolean;
  autoFocusMonto?: boolean;
}

export function MovimientoForm({
  categorias,
  valoresIniciales,
  onGuardar,
  etiquetaBoton,
  limpiarAlGuardar = false,
  autoFocusMonto = false,
}: MovimientoFormProps) {
  const [tipo, setTipo] = useState<TipoMovimiento>(valoresIniciales?.tipo ?? 'gasto');
  const [categoriaId, setCategoriaId] = useState<string | null>(valoresIniciales?.categoriaId ?? null);
  const [monto, setMonto] = useState(valoresIniciales ? String(valoresIniciales.monto).replace('.', ',') : '');
  const [fecha, setFecha] = useState(valoresIniciales?.fecha ?? fechaDeHoy());
  const [descripcion, setDescripcion] = useState(valoresIniciales?.descripcion ?? '');
  const [medioPago, setMedioPago] = useState<MedioPago>(valoresIniciales?.medioPago ?? 'efectivo');

  const [mostrarPicker, setMostrarPicker] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmacion, setConfirmacion] = useState(false);
  const montoRef = useRef<TextInput>(null);

  useFocusEffect(
    useCallback(() => {
      if (!autoFocusMonto) return;
      const timer = setTimeout(() => montoRef.current?.focus(), 150);
      return () => clearTimeout(timer);
    }, [])
  );

  const categoriasFiltradas = categorias.filter((c) => c.tipo === tipo && c.activa);
  const opcionesCategoria = categoriasFiltradas.map((c) => ({ value: c.id, label: c.nombre, color: c.color }));

  function handleCambiarTipo(nuevoTipo: TipoMovimiento) {
    setTipo(nuevoTipo);
    if (!categorias.find((c) => c.id === categoriaId && c.tipo === nuevoTipo)) {
      setCategoriaId(null);
    }
  }

  function montoValido(): number | null {
    const normalizado = monto.trim().replace(',', '.');
    const valor = Number(normalizado);
    if (!normalizado || Number.isNaN(valor) || valor <= 0) return null;
    return valor;
  }

  async function handleGuardar() {
    setError(null);
    const valorMonto = montoValido();

    if (!valorMonto) {
      setError('Ingresá un monto válido, mayor a cero.');
      return;
    }
    if (!categoriaId) {
      setError('Elegí una categoría.');
      return;
    }

    setGuardando(true);
    try {
      await onGuardar({
        tipo,
        categoriaId,
        monto: valorMonto,
        fecha,
        descripcion: descripcion.trim() || null,
        medioPago,
      });

      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setConfirmacion(true);
      setTimeout(() => setConfirmacion(false), 1800);

      if (limpiarAlGuardar) {
        setMonto('');
        setDescripcion('');
        setCategoriaId(null);
        setFecha(fechaDeHoy());
        montoRef.current?.focus();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ocurrió un error al guardar.');
    } finally {
      setGuardando(false);
    }
  }

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        {error ? <Banner message={error} /> : null}
        {confirmacion ? <Banner variant="success" message="Movimiento guardado." /> : null}

        <PillSelector label="Tipo" value={tipo} options={OPCIONES_TIPO} onChange={handleCambiarTipo} />

        <View style={styles.montoContainer}>
          <Text style={styles.label}>Monto</Text>
          <TextInput
            ref={montoRef}
            value={monto}
            onChangeText={setMonto}
            keyboardType="decimal-pad"
            placeholder="0,00"
            placeholderTextColor={Colors.textSecondary}
            style={styles.montoInput}
          />
        </View>

        <SelectField
          label="Categoría"
          value={categoriaId}
          options={opcionesCategoria}
          onChange={(v) => setCategoriaId(v)}
          placeholder="Elegí una categoría"
        />

        <View style={styles.container2}>
          <Text style={styles.label}>Fecha</Text>
          <Pressable style={styles.dateField} onPress={() => setMostrarPicker(true)}>
            <Text style={styles.dateText}>{formatFecha(fecha)}</Text>
            <Ionicons name="calendar-outline" size={18} color={Colors.textSecondary} />
          </Pressable>
          {mostrarPicker ? (
            <DateTimePicker
              value={parseISO(fecha)}
              mode="date"
              display={Platform.OS === 'ios' ? 'inline' : 'default'}
              maximumDate={new Date()}
              onChange={(_event, fechaSeleccionada) => {
                setMostrarPicker(Platform.OS === 'ios');
                if (fechaSeleccionada) {
                  const anio = fechaSeleccionada.getFullYear();
                  const mes = String(fechaSeleccionada.getMonth() + 1).padStart(2, '0');
                  const dia = String(fechaSeleccionada.getDate()).padStart(2, '0');
                  setFecha(`${anio}-${mes}-${dia}`);
                }
              }}
            />
          ) : null}
        </View>

        <TextField
          label="Descripción (opcional)"
          value={descripcion}
          onChangeText={setDescripcion}
          placeholder="Ej: supermercado del sábado"
        />

        <PillSelector label="Medio de pago" value={medioPago} options={OPCIONES_MEDIO_PAGO} onChange={setMedioPago} />

        <Button title={etiquetaBoton} onPress={handleGuardar} loading={guardando} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  container: {
    padding: Spacing.lg,
    gap: Spacing.lg,
  },
  container2: {
    gap: Spacing.xs,
  },
  label: {
    color: Colors.textSecondary,
    fontSize: FontSize.sm,
  },
  montoContainer: {
    gap: Spacing.xs,
  },
  montoInput: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    color: Colors.text,
    fontSize: FontSize.xxl,
    fontWeight: '700',
  },
  dateField: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
  },
  dateText: {
    color: Colors.text,
    fontSize: FontSize.md,
  },
});
