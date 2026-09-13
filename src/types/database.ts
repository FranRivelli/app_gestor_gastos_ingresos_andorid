export type TipoMovimiento = 'ingreso' | 'gasto';
export type NaturalezaCategoria = 'fijo' | 'variable';
export type MedioPago = 'efectivo' | 'débito' | 'crédito' | 'transferencia' | 'QR';

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
  id_externo: string | null;
  lote_importacion_id: string | null;
  fecha_importacion: string | null;
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

export type ReglaCategorizacion = {
  id: string;
  user_id: string;
  patron: string;
  categoria_id: string;
  created_at: string;
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
        Insert: Omit<Movimiento, 'id' | 'created_at' | 'id_externo' | 'lote_importacion_id' | 'fecha_importacion'> & {
          id?: string;
          created_at?: string;
          id_externo?: string | null;
          lote_importacion_id?: string | null;
          fecha_importacion?: string | null;
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
      reglas_categorizacion: {
        Row: ReglaCategorizacion;
        Insert: Omit<ReglaCategorizacion, 'id' | 'created_at'> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Omit<ReglaCategorizacion, 'id' | 'user_id'>>;
        Relationships: [
          {
            foreignKeyName: 'reglas_categorizacion_categoria_id_fkey';
            columns: ['categoria_id'];
            isOneToOne: false;
            referencedRelation: 'categorias';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: {
      resetear_cuenta: {
        Args: Record<PropertyKey, never>;
        Returns: undefined;
      };
    };
  };
};
