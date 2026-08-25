// Formato manual (no Intl): Hermes no garantiza soporte completo de
// datos ICU para 'es-AR' en todas las builds, y el formato pedido
// ($ 1.234.567,89) tiene que ser exacto y previsible en todas las plataformas.
export function formatMonto(valor: number): string {
  const signo = valor < 0 ? '-' : '';
  const [entero, decimal] = Math.abs(valor).toFixed(2).split('.');
  const enteroConPuntos = entero.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${signo}$ ${enteroConPuntos},${decimal}`;
}

// Recibe una fecha "YYYY-MM-DD" (columna `date` de Postgres) y la formatea
// como dd/mm/aaaa. Se arma con split en vez de `new Date(...)` para no
// depender de la zona horaria del dispositivo (evita que un date-only string
// se interprete en UTC y "salte" de día en zonas horarias negativas).
export function formatFecha(fechaISO: string): string {
  const [anio, mes, dia] = fechaISO.split('-');
  return `${dia}/${mes}/${anio}`;
}

export function fechaDeHoy(): string {
  const hoy = new Date();
  const anio = hoy.getFullYear();
  const mes = String(hoy.getMonth() + 1).padStart(2, '0');
  const dia = String(hoy.getDate()).padStart(2, '0');
  return `${anio}-${mes}-${dia}`;
}

export function capitalizar(texto: string): string {
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}
