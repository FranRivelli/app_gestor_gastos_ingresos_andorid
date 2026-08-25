import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Banner } from '@/components/ui/Banner';
import { Button } from '@/components/ui/Button';
import { Colors, FontSize, Spacing } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';

// Placeholder temporal: la Fase 5 agrega ABM de categorías y exportar CSV.
export default function AjustesScreen() {
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
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={styles.content}>
        <Text style={styles.email}>{session?.user.email}</Text>
        <Text style={styles.subtitle}>
          La administración de categorías y la exportación a CSV llegan en una próxima fase.
        </Text>
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
    padding: Spacing.xl,
    gap: Spacing.md,
  },
  email: {
    color: Colors.text,
    fontSize: FontSize.lg,
    fontWeight: '700',
  },
  subtitle: {
    color: Colors.textSecondary,
    fontSize: FontSize.sm,
    marginBottom: Spacing.lg,
  },
});
