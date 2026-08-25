import { supabase } from './supabase';
import type { Movimiento, MovimientoConCategoria, TipoMovimiento } from '@/types/database';

async function getUserId(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  const userId = data.session?.user.id;
  if (!userId) throw new Error('No hay sesión activa.');
  return userId;
}

function rangoMes(anio: number, mes: number): { desde: string; hasta: string } {
  const desde = `${anio}-${String(mes).padStart(2, '0')}-01`;
  const ultimoDia = new Date(anio, mes, 0).getDate();
  const hasta = `${anio}-${String(mes).padStart(2, '0')}-${String(ultimoDia).padStart(2, '0')}`;
  return { desde, hasta };
}

export interface FiltrosMovimientos {
  anio: number;
  mes: number;
  tipo?: TipoMovimiento;
  categoriaId?: string;
}

export async function fetchMovimientos(filtros: FiltrosMovimientos): Promise<MovimientoConCategoria[]> {
  const { desde, hasta } = rangoMes(filtros.anio, filtros.mes);
  let query = supabase
    .from('movimientos')
    .select('*, categoria:categorias(nombre, color, tipo)')
    .gte('fecha', desde)
    .lte('fecha', hasta)
    .order('fecha', { ascending: false })
    .order('created_at', { ascending: false });

  if (filtros.tipo) {
    query = query.eq('tipo', filtros.tipo);
  }
  if (filtros.categoriaId) {
    query = query.eq('categoria_id', filtros.categoriaId);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data as unknown as MovimientoConCategoria[];
}

export async function fetchMovimiento(id: string): Promise<Movimiento> {
  const { data, error } = await supabase.from('movimientos').select('*').eq('id', id).single();
  if (error) throw error;
  return data;
}

export type NuevoMovimiento = Omit<Movimiento, 'id' | 'user_id' | 'created_at'>;

export async function crearMovimiento(input: NuevoMovimiento): Promise<Movimiento> {
  const user_id = await getUserId();
  const { data, error } = await supabase
    .from('movimientos')
    .insert({ ...input, user_id })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function actualizarMovimiento(id: string, cambios: Partial<NuevoMovimiento>): Promise<Movimiento> {
  const { data, error } = await supabase.from('movimientos').update(cambios).eq('id', id).select().single();
  if (error) throw error;
  return data;
}

export async function eliminarMovimiento(id: string): Promise<void> {
  const { error } = await supabase.from('movimientos').delete().eq('id', id);
  if (error) throw error;
}
