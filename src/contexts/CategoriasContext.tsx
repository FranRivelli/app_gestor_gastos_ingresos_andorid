import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { fetchCategorias } from '@/services/categorias';
import type { Categoria } from '@/types/database';

interface CategoriasContextValue {
  categorias: Categoria[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

const CategoriasContext = createContext<CategoriasContextValue | null>(null);

export function CategoriasProvider({ children }: { children: ReactNode }) {
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setError(null);
    try {
      const data = await fetchCategorias();
      setCategorias(data);
    } catch {
      setError('No se pudieron cargar las categorías.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  const value = useMemo(() => ({ categorias, loading, error, refetch }), [categorias, loading, error, refetch]);

  return <CategoriasContext.Provider value={value}>{children}</CategoriasContext.Provider>;
}

export function useCategorias() {
  const ctx = useContext(CategoriasContext);
  if (!ctx) throw new Error('useCategorias debe usarse dentro de <CategoriasProvider>');
  return ctx;
}
