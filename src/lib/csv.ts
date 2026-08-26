import { formatFecha } from './format';
import type { MovimientoConCategoria } from '@/types/database';

function escaparCampoCSV(valor: string): string {
  if (/[",\r\n]/.test(valor)) {
    return `"${valor.replace(/"/g, '""')}"`;
  }
  return valor;
}

export function construirCSVMovimientos(movimientos: MovimientoConCategoria[]): string {
  const encabezado = ['Fecha', 'Tipo', 'Categoría', 'Monto', 'Descripción', 'Medio de pago'];
  const filas = movimientos.map((m) => [
    formatFecha(m.fecha),
    m.tipo === 'ingreso' ? 'Ingreso' : 'Gasto',
    m.categoria.nombre,
    m.monto.toFixed(2).replace('.', ','),
    m.descripcion ?? '',
    m.medio_pago,
  ]);

  return [encabezado, ...filas].map((fila) => fila.map(escaparCampoCSV).join(',')).join('\r\n');
}
