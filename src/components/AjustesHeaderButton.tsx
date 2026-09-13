import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable } from 'react-native';

import { Colors } from '@/constants/theme';

// Botón de Ajustes compartido por el header de todas las pestañas — única
// fuente para que no queden versiones ligeramente distintas entre pantallas
// que definen su propio headerRight (como Movimientos en modo selección).
export function AjustesHeaderButton() {
  return (
    <Pressable onPress={() => router.push('/ajustes')} hitSlop={12} style={{ marginRight: 16 }}>
      <Ionicons name="settings-outline" size={22} color={Colors.text} />
    </Pressable>
  );
}
