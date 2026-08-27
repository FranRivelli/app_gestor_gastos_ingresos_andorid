// Setup type definitions for built-in Supabase Runtime APIs
import "@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "@supabase/server";
import { extractText } from "unpdf";

// TEMPORAL: por ahora esta función solo decodifica el PDF y devuelve el
// texto crudo extraído por página, sin parsear filas todavía. Es a propósito
// — el layout real de un resumen de Mercado Pago (cómo unpdf ordena el texto
// de una tabla) hay que verlo contra un PDF real antes de escribir el
// parser de movimientos, en vez de adivinar la estructura.

interface RequestBody {
  pdfBase64: string;
}

function decodificarBase64(base64: string): Uint8Array {
  const binario = atob(base64);
  const bytes = new Uint8Array(binario.length);
  for (let i = 0; i < binario.length; i++) {
    bytes[i] = binario.charCodeAt(i);
  }
  return bytes;
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
      return Response.json({ totalPages, paginas });
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
