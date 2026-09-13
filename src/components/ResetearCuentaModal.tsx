import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { Banner } from '@/components/ui/Banner';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/TextField';
import { Colors, FontSize, Radius, Spacing } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { traducirErrorDatos } from '@/services/errors';
import { contarMovimientos, resetearCuenta } from '@/services/cuenta';

interface ResetearCuentaModalProps {
  visible: boolean;
  onClose: () => void;
  onReseteado: () => void;
}

export function ResetearCuentaModal({ visible, onClose, onReseteado }: ResetearCuentaModalProps) {
  const { session, signIn } = useAuth();

  const [cantidadMovimientos, setCantidadMovimientos] = useState<number | null>(null);
  const [password, setPassword] = useState('');
  const [procesando, setProcesando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    setPassword('');
    setError(null);
    setCantidadMovimientos(null);
    contarMovimientos()
      .then(setCantidadMovimientos)
      .catch(() => setCantidadMovimientos(0));
  }, [visible]);

  function handleClose() {
    setPassword('');
    setError(null);
    onClose();
  }

  async function handleConfirmar() {
    if (!session?.user.email) {
      setError('No se pudo identificar tu sesión. Cerrá sesión y volvé a entrar.');
      return;
    }
    if (!password) {
      setError('Ingresá tu contraseña para confirmar.');
      return;
    }

    setError(null);
    setProcesando(true);
    try {
      await signIn(session.user.email, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo verificar la contraseña.');
      setProcesando(false);
      return;
    }

    try {
      await resetearCuenta();
      setPassword('');
      onReseteado();
      onClose();
    } catch (err) {
      setError(traducirErrorDatos(err));
    } finally {
      setProcesando(false);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <Pressable style={styles.backdrop} onPress={handleClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <View style={styles.content}>
              <Text style={styles.titulo}>Resetear cuenta</Text>

              {error ? <Banner message={error} /> : null}

              <Text style={styles.advertencia}>
                Esta acción es irreversible. Se van a borrar
                {cantidadMovimientos === null ? ' tus movimientos' : ` tus ${cantidadMovimientos} movimiento${cantidadMovimientos === 1 ? '' : 's'}`}
                , tus presupuestos y tus reglas de categorización, y las categorías vuelven a las 23 por defecto.
              </Text>

              <TextField
                label="Confirmá tu contraseña"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoCapitalize="none"
                placeholder="Contraseña"
              />

              <Button
                title="Resetear cuenta"
                onPress={handleConfirmar}
                loading={procesando}
                disabled={!password}
                style={styles.botonPeligro}
              />
              <Button title="Cancelar" variant="secondary" onPress={handleClose} disabled={procesando} />
            </View>
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
  advertencia: {
    color: Colors.textSecondary,
    fontSize: FontSize.sm,
  },
  botonPeligro: {
    backgroundColor: Colors.expense,
  },
});
