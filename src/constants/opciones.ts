import type { MedioPago, TipoMovimiento } from '@/types/database';

export const OPCIONES_TIPO: { value: TipoMovimiento; label: string }[] = [
  { value: 'gasto', label: 'Gasto' },
  { value: 'ingreso', label: 'Ingreso' },
];

export const OPCIONES_MEDIO_PAGO: { value: MedioPago; label: string }[] = [
  { value: 'efectivo', label: 'Efectivo' },
  { value: 'débito', label: 'Débito' },
  { value: 'crédito', label: 'Crédito' },
  { value: 'transferencia', label: 'Transferencia' },
  { value: 'QR', label: 'QR' },
];
