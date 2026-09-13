import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';

import { AjustesHeaderButton } from '@/components/AjustesHeaderButton';
import { MonthYearPicker } from '@/components/MonthYearPicker';
import { Colors } from '@/constants/theme';
import { useDashboardPeriod } from '@/contexts/DashboardPeriodContext';

function InicioHeaderTitle() {
  const { anio, mes, setPeriodo } = useDashboardPeriod();
  return <MonthYearPicker anio={anio} mes={mes} onChange={setPeriodo} />;
}

function TabsNavigator() {
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: Colors.surface },
        headerTintColor: Colors.text,
        headerShadowVisible: false,
        headerRight: () => <AjustesHeaderButton />,
        tabBarStyle: { backgroundColor: Colors.surface, borderTopColor: Colors.border },
        tabBarActiveTintColor: Colors.accent,
        tabBarInactiveTintColor: Colors.textSecondary,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Inicio',
          headerTitle: () => <InicioHeaderTitle />,
          tabBarIcon: ({ color, size }) => <Ionicons name="home-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="cargar"
        options={{
          title: 'Cargar',
          tabBarIcon: ({ color, size }) => <Ionicons name="add-circle-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="movimientos"
        options={{
          title: 'Movimientos',
          tabBarIcon: ({ color, size }) => <Ionicons name="list-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="presupuesto"
        options={{
          title: 'Presupuesto',
          tabBarIcon: ({ color, size }) => <Ionicons name="pie-chart-outline" size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}

export default function TabsLayout() {
  return <TabsNavigator />;
}
