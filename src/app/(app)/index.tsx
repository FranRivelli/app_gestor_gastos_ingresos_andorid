import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Banner } from '@/components/ui/Banner';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/contexts/AuthContext';
import { Colors, FontSize, Spacing } from '@/constants/theme';

// Placeholder temporal: la Fase 3 reemplaza esta pantalla por los tabs
// (Inicio, Cargar, Movimientos, Presupuesto) y mueve "Cerrar sesión" a Ajustes.
export default function InicioPlaceholder() {
  const { session, signOut } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSignOut() {
    setError(null);
    setLoading(true);
    try {
      await signOut();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ocurrió un error. Intentá de nuevo.');
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Sesión iniciada</Text>
        <Text style={styles.email}>{session?.user.email}</Text>
        {error ? <Banner message={error} /> : null}
        <Button title="Cerrar sesión" variant="secondary" onPress={handleSignOut} loading={loading} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
    gap: Spacing.md,
  },
  title: {
    color: Colors.text,
    fontSize: FontSize.xl,
    fontWeight: '700',
  },
  email: {
    color: Colors.textSecondary,
    fontSize: FontSize.md,
    marginBottom: Spacing.md,
  },
});
