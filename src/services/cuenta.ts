import { supabase } from './supabase';

export async function contarMovimientos(): Promise<number> {
  const { count, error } = await supabase.from('movimientos').select('id', { count: 'exact', head: true });
  if (error) throw error;
  return count ?? 0;
}

// La verificación de contraseña se hace con useAuth().signIn (reautentica
// contra Supabase Auth) antes de llamar a esto — acá no se toca ni se
// compara ninguna contraseña. resetear_cuenta() es una función de Postgres
// (security invoker, respeta RLS) que borra movimientos/presupuestos/reglas
// y vuelve a sembrar las 23 categorías por defecto para el usuario actual.
export async function resetearCuenta(): Promise<void> {
  const { error } = await supabase.rpc('resetear_cuenta');
  if (error) throw error;
}
