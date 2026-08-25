import { Link, router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Banner } from '@/components/ui/Banner';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/TextField';
import { useAuth } from '@/contexts/AuthContext';
import { Colors, FontSize, Spacing } from '@/constants/theme';

export default function RegisterScreen() {
  const { signUp } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmacionEnviada, setConfirmacionEnviada] = useState(false);

  const puedeEnviar = email.trim().length > 0 && password.length >= 6 && !loading;

  async function handleSubmit() {
    setError(null);
    setLoading(true);
    try {
      const { requiereConfirmacion } = await signUp(email.trim(), password);
      if (requiereConfirmacion) {
        setConfirmacionEnviada(true);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ocurrió un error. Intentá de nuevo.');
    } finally {
      setLoading(false);
    }
  }

  if (confirmacionEnviada) {
    return (
      <View style={styles.confirmContainer}>
        <Banner variant="success" message="Te enviamos un email para confirmar tu cuenta. Confirmalo y volvé a iniciar sesión." />
        <Button title="Volver al login" variant="secondary" onPress={() => router.replace('/(auth)/login')} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Crear cuenta</Text>
        <Text style={styles.subtitle}>Registrate para empezar a cargar tus movimientos</Text>

        <View style={styles.form}>
          {error ? <Banner message={error} /> : null}

          <TextField
            label="Email"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            placeholder="tu@email.com"
          />
          <TextField
            label="Contraseña"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
            placeholder="Mínimo 6 caracteres"
          />

          <Button title="Crear cuenta" onPress={handleSubmit} loading={loading} disabled={!puedeEnviar} />
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>¿Ya tenés cuenta?</Text>
          <Link href="/(auth)/login">
            <Text style={styles.linkText}> Iniciá sesión</Text>
          </Link>
        </View>
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
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.xxl,
    gap: Spacing.sm,
  },
  title: {
    color: Colors.text,
    fontSize: FontSize.xl,
    fontWeight: '700',
    textAlign: 'center',
  },
  subtitle: {
    color: Colors.textSecondary,
    fontSize: FontSize.sm,
    marginBottom: Spacing.lg,
    textAlign: 'center',
  },
  form: {
    width: '100%',
    gap: Spacing.md,
  },
  footer: {
    flexDirection: 'row',
    marginTop: Spacing.xl,
    alignItems: 'center',
  },
  footerText: {
    color: Colors.textSecondary,
    fontSize: FontSize.sm,
  },
  linkText: {
    color: Colors.accent,
    fontSize: FontSize.sm,
  },
  confirmContainer: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
    gap: Spacing.lg,
  },
});
