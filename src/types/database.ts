export type TipoMovimiento = 'ingreso' | 'gasto';
export type NaturalezaCategoria = 'fijo' | 'variable';
export type MedioPago = 'efectivo' | 'débito' | 'crédito' | 'transferencia';

export interface Categoria {
  id: string;
  user_id: string;
  nombre: string;
  tipo: TipoMovimiento;
  naturaleza: NaturalezaCategoria;
  color: string;
  activa: boolean;
  created_at: string;
}

export interface Movimiento {
  id: string;
  user_id: string;
  fecha: string;
  tipo: TipoMovimiento;
  categoria_id: string;
  monto: number;
  descripcion: string | null;
  medio_pago: MedioPago;
  created_at: string;
}

export interface Presupuesto {
  id: string;
  user_id: string;
  categoria_id: string;
  anio: number;
  mes: number;
  monto_presupuestado: number;
}

export interface Database {
  public: {
    Tables: {
      categorias: {
        Row: Categoria;
        Insert: Omit<Categoria, 'id' | 'user_id' | 'created_at' | 'activa'> & {
          id?: string;
          created_at?: string;
          activa?: boolean;
        };
        Update: Partial<Omit<Categoria, 'id' | 'user_id'>>;
      };
      movimientos: {
        Row: Movimiento;
        Insert: Omit<Movimiento, 'id' | 'user_id' | 'created_at'> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Omit<Movimiento, 'id' | 'user_id'>>;
      };
      presupuestos: {
        Row: Presupuesto;
        Insert: Omit<Presupuesto, 'id' | 'user_id'> & { id?: string };
        Update: Partial<Omit<Presupuesto, 'id' | 'user_id'>>;
      };
    };
  };
}
