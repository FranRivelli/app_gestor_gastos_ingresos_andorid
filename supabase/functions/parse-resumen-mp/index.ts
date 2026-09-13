// Setup type definitions for built-in Supabase Runtime APIs
import "@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "@supabase/server";
import { extractText } from "unpdf";

// El texto que devuelve unpdf por página no respeta el orden visual del PDF
// (el pie de página legal de una página puede salir ANTES que el
// encabezado de esa misma página en el string extraído) y las filas largas
// se parten en dos líneas de texto. Por eso el parser no confía en
// posición/orden de bloques: detecta el inicio de una fila por el patrón de
// fecha "DD-MM-YYYY" al principio de línea y va acumulando líneas hasta que
// el buffer matchea una fila completa (fecha + descripción + ID + valor +
// saldo). Cualquier línea que no forma parte de una fila (encabezados
// repetidos, pies de página, títulos) nunca dispara el regex de fecha, así
// que se ignora sola sin necesidad de listarla a mano.

const MARCADOR_SECCION_DOLARES = "RESUMEN DE TENENCIAS EN DÓLARES";
const REGEX_INICIO_FECHA = /^(\d{2})-(\d{2})-(\d{4})\b/;
const REGEX_FILA_COMPLETA =
  /^(\d{2})-(\d{2})-(\d{4})\s+(.+?)\s+(\d{9,15})\s+\$\s*(-?[\d.,]+)\s+\$\s*(-?[\d.,]+)$/;

interface RequestBody {
  pdfBase64: string;
}

interface MovimientoParseado {
  fecha: string;
  descripcion: string;
  id_operacion: string;
  monto: number;
  tipo: "gasto" | "ingreso";
  esRendimiento: boolean;
  requiereConfirmacion: boolean;
}

function decodificarBase64(base64: string): Uint8Array {
  const binario = atob(base64);
  const bytes = new Uint8Array(binario.length);
  for (let i = 0; i < binario.length; i++) {
    bytes[i] = binario.charCodeAt(i);
  }
  return bytes;
}

// "-1.400,00" -> -1400 ; "2,63" -> 2.63 (formato AR: punto de miles, coma decimal)
function parsearMontoAr(crudo: string): number {
  return Number(crudo.replace(/\./g, "").replace(",", "."));
}

// Recorta el texto de las páginas a solo la sección "en pesos", descartando
// desde el título del resumen de tenencias en dólares en adelante.
function recortarSeccionPesos(paginas: string[]): string[] {
  const lineas: string[] = [];
  for (const pagina of paginas) {
    const idx = pagina.indexOf(MARCADOR_SECCION_DOLARES);
    if (idx === -1) {
      lineas.push(...pagina.split("\n"));
      continue;
    }
    lineas.push(...pagina.slice(0, idx).split("\n"));
    break;
  }
  return lineas;
}

function parsearMovimientos(paginas: string[]): {
  movimientos: MovimientoParseado[];
  filasSinParsear: string[];
} {
  const lineas = recortarSeccionPesos(paginas);
  const movimientos: MovimientoParseado[] = [];
  const filasSinParsear: string[] = [];

  let buffer: string | null = null;
  const descartarBuffer = () => {
    if (buffer !== null) {
      filasSinParsear.push(buffer);
      buffer = null;
    }
  };

  for (const lineaCruda of lineas) {
    const linea = lineaCruda.trim();
    if (linea === "") continue;

    if (REGEX_INICIO_FECHA.test(linea)) {
      // Si había una fila a medio armar cuando empieza otra, se perdió algo: se registra para revisar.
      descartarBuffer();
      buffer = linea;
    } else if (buffer !== null) {
      buffer = `${buffer} ${linea}`;
    } else {
      continue; // línea suelta que no pertenece a ninguna fila (encabezado, pie de página, etc.)
    }

    const match = REGEX_FILA_COMPLETA.exec(buffer.replace(/\s+/g, " ").trim());
    if (!match) continue;

    const [, dd, mm, yyyy, descripcionCruda, idOperacion, montoCrudo] = match;
    const descripcion = descripcionCruda.replace(/\s+/g, " ").trim();
    const monto = parsearMontoAr(montoCrudo);

    movimientos.push({
      fecha: `${yyyy}-${mm}-${dd}`,
      descripcion,
      id_operacion: idOperacion,
      monto,
      tipo: monto < 0 ? "gasto" : "ingreso",
      esRendimiento: descripcion === "Rendimientos",
      requiereConfirmacion: descripcion === "Ingreso de dinero",
    });
    buffer = null;
  }
  descartarBuffer();

  return { movimientos, filasSinParsear };
}

function redondear(valor: number): number {
  return Math.round(valor * 100) / 100;
}

export default {
  fetch: withSupabase({ auth: ["publishable", "secret"] }, async (req) => {
    if (req.method !== "POST") {
      return Response.json({ error: "Método no permitido." }, { status: 405 });
    }

    let body: RequestBody;
    try {
      body = await req.json();
    } catch {
      return Response.json({ error: "Body inválido, se espera JSON." }, { status: 400 });
    }

    if (!body.pdfBase64) {
      return Response.json({ error: "Falta pdfBase64." }, { status: 400 });
    }

    let bytes: Uint8Array;
    try {
      bytes = decodificarBase64(body.pdfBase64);
    } catch {
      return Response.json({ error: "pdfBase64 no es un base64 válido." }, { status: 400 });
    }

    try {
      const { totalPages, text } = await extractText(bytes, { mergePages: false });
      const paginas = Array.isArray(text) ? text : [text];
      const { movimientos, filasSinParsear } = parsearMovimientos(paginas);

      const entradas = movimientos
        .filter((m) => m.tipo === "ingreso")
        .reduce((acc, m) => acc + m.monto, 0);
      const salidas = movimientos
        .filter((m) => m.tipo === "gasto")
        .reduce((acc, m) => acc + m.monto, 0);

      return Response.json({
        totalPages,
        movimientos,
        resumen: {
          cantidadFilas: movimientos.length,
          entradas: redondear(entradas),
          salidas: redondear(salidas),
          filasSinParsear,
        },
      });
    } catch (err) {
      return Response.json(
        { error: "No se pudo leer el PDF.", detalle: err instanceof Error ? err.message : String(err) },
        { status: 422 }
      );
    }
  }),
};

/* Para probar local (necesita Docker + `supabase start`):

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/parse-resumen-mp' \
    --header 'apiKey: TU_PUBLISHABLE_KEY' \
    --header 'Content-Type: application/json' \
    --data '{"pdfBase64":"..."}'

*/
