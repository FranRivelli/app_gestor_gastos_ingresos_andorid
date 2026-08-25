import { useEffect, useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Colors, FontSize, Spacing } from '@/constants/theme';

type EstadoSupabase = 'verificando' | 'ok' | 'faltan_variables' | 'error';

export default function PantallaInicial() {
  const [estado, setEstado] = useState<EstadoSupabase>('verificando');

  useEffect(() => {
    if (!process.env.EXPO_PUBLIC_SUPABASE_URL || !process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY) {
      setEstado('faltan_variables');
      return;
    }
    import('@/services/supabase')
      .then(() => setEstado('ok'))
      .catch(() => setEstado('error'));
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Image source={require('../../assets/logo.png')} style={styles.logo} resizeMode="contain" />
        <Text style={styles.title}>Pesimios Argensirios</Text>
        <Text style={styles.subtitle}>Fase 1: proyecto base</Text>

        <View style={styles.statusBox}>
          {estado === 'verificando' && <Text style={styles.statusText}>Verificando configuración…</Text>}
          {estado === 'ok' && (
            <Text style={[styles.statusText, { color: Colors.income }]}>
              Cliente de Supabase inicializado correctamente.
            </Text>
          )}
          {estado === 'faltan_variables' && (
            <Text style={[styles.statusText, { color: Colors.warning }]}>
              Faltan EXPO_PUBLIC_SUPABASE_URL y/o EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY en el .env.
            </Text>
          )}
          {estado === 'error' && (
            <Text style={[styles.statusText, { color: Colors.expense }]}>
              No se pudo inicializar el cliente de Supabase. Revisá el .env.
            </Text>
          )}
        </View>
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
  logo: {
    width: 120,
    height: 120,
    marginBottom: Spacing.md,
  },
  title: {
    color: Colors.text,
    fontSize: FontSize.xxl,
    fontWeight: '700',
    textAlign: 'center',
  },
  subtitle: {
    color: Colors.textSecondary,
    fontSize: FontSize.md,
    textAlign: 'center',
  },
  statusBox: {
    marginTop: Spacing.xl,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  statusText: {
    fontSize: FontSize.sm,
    color: Colors.text,
    textAlign: 'center',
  },
});
