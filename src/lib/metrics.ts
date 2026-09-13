import type { MedioPago, MovimientoConCategoria } from '@/types/database';
import type { MovimientoResumen } from '@/services/movimientos';

export interface ResumenCategoria {
  categoriaId: string;
  nombre: string;
  color: string;
  monto: number;
  porcentaje: number;
}

export interface ResumenMes {
  ingresos: number;
  gastos: number;
  balance: number;
  tasaAhorro: number;
  gastosPorCategoria: ResumenCategoria[];
}

// La tasa de ahorro pedida es "% de ingresos que fue a Ahorro + Inversiones".
// No hay una columna que marque una categoría como "de ahorro", así que se
// identifica por nombre contra las categorías sembradas por defecto. Si estas
// dos categorías se renombran desde Ajustes, dejan de contar para este cálculo.
const NOMBRES_CATEGORIAS_AHORRO = ['Ahorro', 'Inversiones'];

export function calcularResumenMes(movimientos: MovimientoConCategoria[]): ResumenMes {
  let ingresos = 0;
  let gastos = 0;
  let ahorro = 0;
  const porCategoria = new Map<string, ResumenCategoria>();

  for (const mov of movimientos) {
    if (mov.tipo === 'ingreso') {
      ingresos += mov.monto;
      continue;
    }

    gastos += mov.monto;
    if (NOMBRES_CATEGORIAS_AHORRO.includes(mov.categoria.nombre)) {
      ahorro += mov.monto;
    }

    const existente = porCategoria.get(mov.categoria_id);
    if (existente) {
      existente.monto += mov.monto;
    } else {
      porCategoria.set(mov.categoria_id, {
        categoriaId: mov.categoria_id,
        nombre: mov.categoria.nombre,
        color: mov.categoria.color,
        monto: mov.monto,
        porcentaje: 0,
      });
    }
  }

  const gastosPorCategoria = Array.from(porCategoria.values())
    .sort((a, b) => b.monto - a.monto)
    .map((c) => ({ ...c, porcentaje: gastos > 0 ? (c.monto / gastos) * 100 : 0 }));

  return {
    ingresos,
    gastos,
    balance: ingresos - gastos,
    tasaAhorro: ingresos > 0 ? (ahorro / ingresos) * 100 : 0,
    gastosPorCategoria,
  };
}

export interface ResumenMedioPago {
  medioPago: MedioPago;
  monto: number;
  porcentaje: number;
}

export function calcularGastoPorMedioPago(movimientos: MovimientoConCategoria[]): ResumenMedioPago[] {
  const totales = new Map<MedioPago, number>();
  let total = 0;
  for (const mov of movimientos) {
    if (mov.tipo !== 'gasto') continue;
    totales.set(mov.medio_pago, (totales.get(mov.medio_pago) ?? 0) + mov.monto);
    total += mov.monto;
  }
  return Array.from(totales.entries())
    .map(([medioPago, monto]) => ({ medioPago, monto, porcentaje: total > 0 ? (monto / total) * 100 : 0 }))
    .sort((a, b) => b.monto - a.monto);
}

export interface PeriodoMes {
  anio: number;
  mes: number;
}

export interface PuntoTendencia extends PeriodoMes {
  ingresos: number;
  gastos: number;
}

export function ultimosSeisMeses(anio: number, mes: number): PeriodoMes[] {
  const resultado: PeriodoMes[] = [];
  for (let i = 5; i >= 0; i--) {
    let m = mes - i;
    let a = anio;
    while (m <= 0) {
      m += 12;
      a -= 1;
    }
    resultado.push({ anio: a, mes: m });
  }
  return resultado;
}

export function calcularTendenciaMeses(movimientos: MovimientoResumen[], meses: PeriodoMes[]): PuntoTendencia[] {
  return meses.map(({ anio, mes }) => {
    let ingresos = 0;
    let gastos = 0;
    for (const mov of movimientos) {
      const [movAnio, movMes] = mov.fecha.split('-').map(Number);
      if (movAnio === anio && movMes === mes) {
        if (mov.tipo === 'ingreso') ingresos += mov.monto;
        else gastos += mov.monto;
      }
    }
    return { anio, mes, ingresos, gastos };
  });
}
