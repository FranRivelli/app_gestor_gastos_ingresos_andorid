import { getUserId, supabase } from './supabase';
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

export type NuevaCategoria = Pick<Categoria, 'nombre' | 'tipo' | 'naturaleza' | 'color'>;

export async function crearCategoria(input: NuevaCategoria): Promise<Categoria> {
  const user_id = await getUserId();
  const { data, error } = await supabase
    .from('categorias')
    .insert({ ...input, user_id })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export type CambiosCategoria = Partial<Pick<Categoria, 'nombre' | 'color' | 'naturaleza' | 'activa'>>;

export async function actualizarCategoria(id: string, cambios: CambiosCategoria): Promise<Categoria> {
  const { data, error } = await supabase.from('categorias').update(cambios).eq('id', id).select().single();
  if (error) throw error;
  return data;
}

// Postgres levanta foreign_key_violation (categoria_id ... on delete restrict)
// cuando la categoría tiene movimientos asociados. Se distingue ese caso para
// que la UI pueda ofrecer desactivarla en vez de mostrar un error genérico.
export class CategoriaConMovimientosError extends Error {}

export async function eliminarCategoria(id: string): Promise<void> {
  const { error } = await supabase.from('categorias').delete().eq('id', id);
  if (error) {
    if (error.code === '23503') {
      throw new CategoriaConMovimientosError(
        'Esta categoría tiene movimientos asociados y no se puede eliminar.'
      );
    }
    throw error;
  }
}
