export type TipoMovimiento = 'ingreso' | 'gasto';
export type NaturalezaCategoria = 'fijo' | 'variable';
export type MedioPago = 'efectivo' | 'débito' | 'crédito' | 'transferencia';

export type Categoria = {
  id: string;
  user_id: string;
  nombre: string;
  tipo: TipoMovimiento;
  naturaleza: NaturalezaCategoria;
  color: string;
  activa: boolean;
  created_at: string;
};

export type Movimiento = {
  id: string;
  user_id: string;
  fecha: string;
  tipo: TipoMovimiento;
  categoria_id: string;
  monto: number;
  descripcion: string | null;
  medio_pago: MedioPago;
  created_at: string;
};

export type MovimientoConCategoria = Movimiento & {
  categoria: Pick<Categoria, 'nombre' | 'color' | 'tipo'>;
};

export type Presupuesto = {
  id: string;
  user_id: string;
  categoria_id: string;
  anio: number;
  mes: number;
  monto_presupuestado: number;
};

export type Database = {
  public: {
    Tables: {
      categorias: {
        Row: Categoria;
        Insert: Omit<Categoria, 'id' | 'created_at' | 'activa'> & {
          id?: string;
          created_at?: string;
          activa?: boolean;
        };
        Update: Partial<Omit<Categoria, 'id' | 'user_id'>>;
        Relationships: [];
      };
      movimientos: {
        Row: Movimiento;
        Insert: Omit<Movimiento, 'id' | 'created_at'> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Omit<Movimiento, 'id' | 'user_id'>>;
        Relationships: [
          {
            foreignKeyName: 'movimientos_categoria_id_fkey';
            columns: ['categoria_id'];
            isOneToOne: false;
            referencedRelation: 'categorias';
            referencedColumns: ['id'];
          },
        ];
      };
      presupuestos: {
        Row: Presupuesto;
        Insert: Omit<Presupuesto, 'id'> & { id?: string };
        Update: Partial<Omit<Presupuesto, 'id' | 'user_id'>>;
        Relationships: [
          {
            foreignKeyName: 'presupuestos_categoria_id_fkey';
            columns: ['categoria_id'];
            isOneToOne: false;
            referencedRelation: 'categorias';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
  };
};
