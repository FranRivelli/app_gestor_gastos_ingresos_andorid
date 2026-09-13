import { getUserId, supabase } from './supabase';
import type { ReglaCategorizacion } from '@/types/database';

export async function fetchReglasCategorizacion(): Promise<ReglaCategorizacion[]> {
  const { data, error } = await supabase.from('reglas_categorizacion').select('*').order('patron');
  if (error) throw error;
  return data;
}

// (user_id, patron) es único: si ya existía una regla para ese patrón, se
// actualiza la categoría en vez de fallar.
export async function guardarReglaCategorizacion(patron: string, categoriaId: string): Promise<ReglaCategorizacion> {
  const user_id = await getUserId();
  const { data, error } = await supabase
    .from('reglas_categorizacion')
    .upsert({ user_id, patron, categoria_id: categoriaId }, { onConflict: 'user_id,patron' })
    .select()
    .single();
  if (error) throw error;
  return data;
}

// Substring case-insensitive: "Carrefour" matchea "Pago con QR Carrefour" y
// también "MERPAGO*ELMERCADILLO" si la regla fuera "elmercadillo".
export function sugerirCategoria(descripcion: string, reglas: ReglaCategorizacion[]): string | null {
  const desc = descripcion.toLowerCase();
  const regla = reglas.find((r) => desc.includes(r.patron.toLowerCase()));
  return regla?.categoria_id ?? null;
}
