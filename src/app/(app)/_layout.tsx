import { Stack } from 'expo-router';

import { Colors } from '@/constants/theme';
import { CategoriasProvider } from '@/contexts/CategoriasContext';

export default function AppLayout() {
  return (
    <CategoriasProvider>
      <Stack
        screenOptions={{
          contentStyle: { backgroundColor: Colors.background },
          headerStyle: { backgroundColor: Colors.surface },
          headerTintColor: Colors.text,
          headerShadowVisible: false,
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="ajustes" options={{ title: 'Ajustes', presentation: 'modal' }} />
        <Stack.Screen name="movimiento/[id]" options={{ title: 'Editar movimiento' }} />
      </Stack>
    </CategoriasProvider>
  );
}
