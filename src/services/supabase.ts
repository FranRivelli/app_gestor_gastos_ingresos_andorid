import 'react-native-url-polyfill/auto';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

import type { Database } from '@/types/database';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabasePublishableKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabasePublishableKey) {
  throw new Error(
    'Faltan EXPO_PUBLIC_SUPABASE_URL y/o EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY. Completá el archivo .env a partir de .env.example.'
  );
}

// En el render estático de Expo Router para web (SSR en Node) no existe
// `window`, y AsyncStorage lo necesita en esa plataforma. Se desactiva la
// persistencia de sesión fuera de un entorno de navegador real; en
// Android/iOS `window` siempre está definido, así que no los afecta.
const enNavegador = typeof window !== 'undefined';

export const supabase = createClient<Database>(supabaseUrl, supabasePublishableKey, {
  auth: {
    storage: enNavegador ? AsyncStorage : undefined,
    autoRefreshToken: enNavegador,
    persistSession: enNavegador,
    detectSessionInUrl: false,
  },
});
