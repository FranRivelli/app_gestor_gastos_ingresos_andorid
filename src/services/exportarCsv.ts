import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import { construirCSVMovimientos } from '@/lib/csv';
import { fetchTodosMovimientos } from './movimientos';

export async function exportarMovimientosCSV(): Promise<void> {
  const movimientos = await fetchTodosMovimientos();
  if (movimientos.length === 0) {
    throw new Error('No tenés movimientos cargados todavía.');
  }

  const csv = construirCSVMovimientos(movimientos);
  const archivo = new File(Paths.cache, `movimientos-${Date.now()}.csv`);
  if (archivo.exists) archivo.delete();
  archivo.create();
  archivo.write(csv);

  const disponible = await Sharing.isAvailableAsync();
  if (!disponible) {
    throw new Error('Compartir no está disponible en este dispositivo.');
  }
  await Sharing.shareAsync(archivo.uri, { mimeType: 'text/csv', dialogTitle: 'Exportar movimientos' });
}
