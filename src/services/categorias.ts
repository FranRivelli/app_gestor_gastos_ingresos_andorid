import { supabase } from './supabase';
import type { Categoria } from '@/types/database';

export async function fetchCategorias(): Promise<Categoria[]> {
  const { data, error } = await supabase.from('categorias').select('*').order('nombre');
  if (error) throw error;
  return data;
}
