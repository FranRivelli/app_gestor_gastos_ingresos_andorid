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

// Recibe un timestamp completo (columna `timestamptz` de Postgres, ej.
// fecha_importacion) y lo formatea como "dd/mm a las hh:mm" en hora local
// del dispositivo. A diferencia de formatFecha, acá `new Date(...)` es
// correcto: el string ya trae fecha+hora+zona, no es un date-only que se
// pueda "correr" de día.
export function formatFechaHora(fechaISO: string): string {
  const d = new Date(fechaISO);
  const dia = String(d.getDate()).padStart(2, '0');
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  const hora = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${dia}/${mes} a las ${hora}:${min}`;
}

export function fechaDeHoy(): string {
  const hoy = new Date();
  const anio = hoy.getFullYear();
  const mes = String(hoy.getMonth() + 1).padStart(2, '0');
  const dia = String(hoy.getDate()).padStart(2, '0');
  return `${anio}-${mes}-${dia}`;
}

// Formato corto para ejes/etiquetas de gráficos ("$50k", "$1.2M"), donde el
// monto exacto no importa tanto como que se lea de un vistazo.
export function formatMontoCorto(valor: number): string {
  const signo = valor < 0 ? '-' : '';
  const abs = Math.abs(valor);
  if (abs >= 1_000_000) return `${signo}$${redondearCorto(abs / 1_000_000)}M`;
  if (abs >= 1_000) return `${signo}$${redondearCorto(abs / 1_000)}k`;
  return `${signo}$${Math.round(abs)}`;
}

function redondearCorto(valor: number): string {
  const redondeado = Math.round(valor * 10) / 10;
  return Number.isInteger(redondeado) ? String(redondeado) : redondeado.toFixed(1);
}

export function capitalizar(texto: string): string {
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}
