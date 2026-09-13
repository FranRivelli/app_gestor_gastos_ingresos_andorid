import type { File } from 'expo-file-system';

import { sugerirCategoria } from './reglasCategorizacion';
import { getUserId, supabase } from './supabase';
import type { Categoria, MedioPago, ReglaCategorizacion, TipoMovimiento } from '@/types/database';

// Forma que devuelve la Edge Function parse-resumen-mp (ver
// supabase/functions/parse-resumen-mp/index.ts). monto viene con signo;
// esRendimiento/requiereConfirmacion ya vienen calculados del lado del server.
export interface MovimientoParseadoMp {
  fecha: string;
  descripcion: string;
  id_operacion: string;
  monto: number;
  tipo: TipoMovimiento;
  esRendimiento: boolean;
  requiereConfirmacion: boolean;
}

export interface ResumenParseoMp {
  cantidadFilas: number;
  entradas: number;
  salidas: number;
  filasSinParsear: string[];
}

interface RespuestaParseoMp {
  totalPages: number;
  movimientos: MovimientoParseadoMp[];
  resumen: ResumenParseoMp;
}

export interface FilaImportacion {
  idExterno: string;
  fecha: string;
  descripcion: string;
  monto: number;
  tipo: TipoMovimiento;
  esRendimiento: boolean;
  requiereConfirmacion: boolean;
  esConsolidado: boolean;
  yaImportada: boolean;
  seleccionada: boolean;
  categoriaId: string;
}

function medioPagoParaDescripcion(descripcion: string): MedioPago {
  return descripcion.startsWith('Pago con QR') ? 'QR' : 'transferencia';
}

export async function invocarParseoMp(archivo: File): Promise<{
  movimientosCrudo: MovimientoParseadoMp[];
  resumen: ResumenParseoMp;
}> {
  const pdfBase64 = await archivo.base64();
  const { data, error } = await supabase.functions.invoke<RespuestaParseoMp>('parse-resumen-mp', {
    body: { pdfBase64 },
  });
  if (error) throw error;
  if (!data) throw new Error('La función no devolvió datos.');
  return { movimientosCrudo: data.movimientos, resumen: data.resumen };
}

// Preferimos "Otros"/"Otros ingresos" por ser el cajón por defecto obvio
// para el usuario; si no existen (se renombraron o borraron), cae a la
// primera categoría activa de ese tipo antes que romper la importación.
function categoriaPorDefecto(tipo: TipoMovimiento, categorias: Categoria[]): string {
  const nombrePreferido = tipo === 'gasto' ? 'Otros' : 'Otros ingresos';
  const activasDelTipo = categorias.filter((c) => c.tipo === tipo && c.activa);
  const preferida = activasDelTipo.find((c) => c.nombre === nombrePreferido);
  if (preferida) return preferida.id;
  if (activasDelTipo[0]) return activasDelTipo[0].id;
  throw new Error(`No tenés categorías activas de tipo "${tipo}" para poder sugerir una.`);
}

function ultimoDiaDelMes(anioMes: string): string {
  const [anio, mes] = anioMes.split('-').map(Number);
  return String(new Date(anio, mes, 0).getDate()).padStart(2, '0');
}

// Construye las filas de previsualización a partir de la respuesta cruda de
// la función. Es sync/pura a propósito: el toggle de "consolidar
// rendimientos" recalcula esto sin volver a llamar a la función (el PDF ya
// se parseó una sola vez).
function construirFilasBase(
  movimientosCrudo: MovimientoParseadoMp[],
  categorias: Categoria[],
  reglas: ReglaCategorizacion[],
  consolidarRendimientos: boolean
): Omit<FilaImportacion, 'yaImportada'>[] {
  const normales = movimientosCrudo.filter((m) => !m.esRendimiento);
  const rendimientos = movimientosCrudo.filter((m) => m.esRendimiento);

  const filas: Omit<FilaImportacion, 'yaImportada'>[] = normales.map((m) => ({
    idExterno: m.id_operacion,
    fecha: m.fecha,
    descripcion: m.descripcion,
    monto: Math.abs(m.monto),
    tipo: m.tipo,
    esRendimiento: false,
    requiereConfirmacion: m.requiereConfirmacion,
    esConsolidado: false,
    seleccionada: true,
    categoriaId: sugerirCategoria(m.descripcion, reglas) ?? categoriaPorDefecto(m.tipo, categorias),
  }));

  if (!consolidarRendimientos) {
    for (const r of rendimientos) {
      filas.push({
        idExterno: r.id_operacion,
        fecha: r.fecha,
        descripcion: r.descripcion,
        monto: Math.abs(r.monto),
        tipo: r.tipo,
        esRendimiento: true,
        requiereConfirmacion: false,
        esConsolidado: false,
        seleccionada: false,
        categoriaId: sugerirCategoria(r.descripcion, reglas) ?? categoriaPorDefecto(r.tipo, categorias),
      });
    }
  } else {
    // Se agrupa por el mes de cada movimiento (no el del archivo): un PDF
    // que cruza dos meses tiene que dejar un consolidado por cada uno.
    const porMes = new Map<string, number>();
    for (const r of rendimientos) {
      const mes = r.fecha.slice(0, 7);
      porMes.set(mes, (porMes.get(mes) ?? 0) + r.monto);
    }
    for (const [mes, monto] of porMes) {
      filas.push({
        idExterno: `rendimientos:${mes}`,
        fecha: `${mes}-${ultimoDiaDelMes(mes)}`,
        descripcion: `Rendimientos consolidados (${mes})`,
        monto: Math.abs(monto),
        tipo: 'ingreso',
        esRendimiento: true,
        requiereConfirmacion: false,
        esConsolidado: true,
        seleccionada: true,
        categoriaId: sugerirCategoria('Rendimientos', reglas) ?? categoriaPorDefecto('ingreso', categorias),
      });
    }
  }

  return filas.sort((a, b) => a.fecha.localeCompare(b.fecha));
}

async function fetchIdsExternosExistentes(ids: string[]): Promise<Set<string>> {
  if (ids.length === 0) return new Set();
  const { data, error } = await supabase.from('movimientos').select('id_externo').in('id_externo', ids);
  if (error) throw error;
  return new Set(data.map((d) => d.id_externo).filter((id): id is string => id !== null));
}

export async function construirVistaPrevia(
  movimientosCrudo: MovimientoParseadoMp[],
  categorias: Categoria[],
  reglas: ReglaCategorizacion[],
  consolidarRendimientos: boolean
): Promise<FilaImportacion[]> {
  const base = construirFilasBase(movimientosCrudo, categorias, reglas, consolidarRendimientos);
  const yaImportados = await fetchIdsExternosExistentes(base.map((f) => f.idExterno));

  return base.map((f) => ({
    ...f,
    yaImportada: yaImportados.has(f.idExterno),
    seleccionada: f.seleccionada && !yaImportados.has(f.idExterno),
  }));
}

// String opaco pero único, no un uuid real: alcanza para agrupar filas de
// una misma importación sin agregar una dependencia nueva solo para generar
// un id (crypto.randomUUID no está garantizado en Hermes/RN sin expo-crypto).
function generarLoteImportacionId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export async function guardarImportacionMp(filas: FilaImportacion[]): Promise<number> {
  const aGuardar = filas.filter((f) => f.seleccionada && !f.yaImportada);
  if (aGuardar.length === 0) return 0;

  const user_id = await getUserId();
  const loteImportacionId = generarLoteImportacionId();
  const fechaImportacion = new Date().toISOString();

  const { error } = await supabase.from('movimientos').insert(
    aGuardar.map((f) => ({
      user_id,
      fecha: f.fecha,
      tipo: f.tipo,
      categoria_id: f.categoriaId,
      monto: f.monto,
      descripcion: f.descripcion,
      medio_pago: medioPagoParaDescripcion(f.descripcion),
      id_externo: f.idExterno,
      lote_importacion_id: loteImportacionId,
      fecha_importacion: fechaImportacion,
    }))
  );
  if (error) throw error;
  return aGuardar.length;
}
