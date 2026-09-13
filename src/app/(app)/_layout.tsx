import { Stack } from 'expo-router';

import { Colors } from '@/constants/theme';
import { CategoriasProvider } from '@/contexts/CategoriasContext';
import { DashboardPeriodProvider } from '@/contexts/DashboardPeriodContext';

export default function AppLayout() {
  return (
    <CategoriasProvider>
      <DashboardPeriodProvider>
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
          <Stack.Screen name="importar-mp" options={{ title: 'Importar Mercado Pago' }} />
        </Stack>
      </DashboardPeriodProvider>
    </CategoriasProvider>
  );
}
