import { getUserId, supabase } from './supabase';
import type { Presupuesto } from '@/types/database';

export async function fetchPresupuestos(anio: number, mes: number): Promise<Presupuesto[]> {
  const { data, error } = await supabase
    .from('presupuestos')
    .select('*')
    .eq('anio', anio)
    .eq('mes', mes);
  if (error) throw error;
  return data;
}

export async function upsertPresupuesto(
  categoriaId: string,
  anio: number,
  mes: number,
  montoPresupuestado: number
): Promise<Presupuesto> {
  const user_id = await getUserId();
  const { data, error } = await supabase
    .from('presupuestos')
    .upsert(
      { user_id, categoria_id: categoriaId, anio, mes, monto_presupuestado: montoPresupuestado },
      { onConflict: 'user_id,categoria_id,anio,mes' }
    )
    .select()
    .single();
  if (error) throw error;
  return data;
}

// Copia los presupuestos de un mes de origen a un mes destino, categoría por
// categoría. Si el destino ya tenía un presupuesto cargado para alguna de
// esas categorías, lo pisa (es un upsert) — la pantalla confirma con el
// usuario antes de llamar a esto.
export async function copiarPresupuesto(
  origen: { anio: number; mes: number },
  destino: { anio: number; mes: number }
): Promise<number> {
  const anteriores = await fetchPresupuestos(origen.anio, origen.mes);
  if (anteriores.length === 0) return 0;

  const user_id = await getUserId();
  const filas = anteriores.map((p) => ({
    user_id,
    categoria_id: p.categoria_id,
    anio: destino.anio,
    mes: destino.mes,
    monto_presupuestado: p.monto_presupuestado,
  }));

  const { error } = await supabase
    .from('presupuestos')
    .upsert(filas, { onConflict: 'user_id,categoria_id,anio,mes' });
  if (error) throw error;
  return filas.length;
}
