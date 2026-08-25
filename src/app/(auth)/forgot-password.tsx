import { Link } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Banner } from '@/components/ui/Banner';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/TextField';
import { useAuth } from '@/contexts/AuthContext';
import { Colors, FontSize, Spacing } from '@/constants/theme';

export default function ForgotPasswordScreen() {
  const { resetPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [enviado, setEnviado] = useState(false);

  const puedeEnviar = email.trim().length > 0 && !loading;

  async function handleSubmit() {
    setError(null);
    setLoading(true);
    try {
      await resetPassword(email.trim());
      setEnviado(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ocurrió un error. Intentá de nuevo.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Recuperar contraseña</Text>
        <Text style={styles.subtitle}>Te enviamos un link a tu email para restablecerla</Text>

        <View style={styles.form}>
          {error ? <Banner message={error} /> : null}
          {enviado ? (
            <Banner
              variant="success"
              message="Si el email está registrado, te llegará un link para restablecer tu contraseña."
            />
          ) : (
            <>
              <TextField
                label="Email"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                autoComplete="email"
                keyboardType="email-address"
                placeholder="tu@email.com"
              />
              <Button title="Enviar link" onPress={handleSubmit} loading={loading} disabled={!puedeEnviar} />
            </>
          )}
        </View>

        <Link href="/(auth)/login" style={styles.link}>
          <Text style={styles.linkText}>Volver al login</Text>
        </Link>
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
  link: {
    marginTop: Spacing.xl,
  },
  linkText: {
    color: Colors.accent,
    fontSize: FontSize.sm,
  },
});
