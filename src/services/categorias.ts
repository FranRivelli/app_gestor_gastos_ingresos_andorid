import { supabase } from './supabase';
import type { Categoria } from '@/types/database';

export async function fetchCategorias(): Promise<Categoria[]> {
  const { data, error } = await supabase.from('categorias').select('*').order('nombre');
  if (error) {
    console.error('[categorias] fetchCategorias falló', {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
    });
    throw error;
  }
  return data;
}
