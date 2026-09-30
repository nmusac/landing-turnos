import "server-only";

// Cliente del Apps Script de google-sheets/Code.gs publicado como aplicación web.
// Lo usan el store de Sheets, los emails y la planilla de prospectos (demos).

export const appsScriptConfigurado = () => !!(process.env.GOOGLE_SHEETS_URL && process.env.GOOGLE_SHEETS_SECRET);

/** Error que devolvió el propio script (ej. "ocupado"), distinto de un fallo de red. */
export class ErrorAppsScript extends Error {}

export async function llamarAppsScript<T>(accion: string, datos: object = {}): Promise<T> {
  const url = process.env.GOOGLE_SHEETS_URL;
  const secreto = process.env.GOOGLE_SHEETS_SECRET;
  if (!url || !secreto) throw new Error("Faltan GOOGLE_SHEETS_URL y GOOGLE_SHEETS_SECRET");

  const r = await fetch(url, {
    method: "POST",
    headers: { "content-type": "text/plain" },
    body: JSON.stringify({ secreto, accion, ...datos }),
    cache: "no-store",
    signal: AbortSignal.timeout(20000),
  });
  const d = await r.json().catch(() => {
    throw new Error(`Google Sheets respondió ${r.status} sin JSON: ¿la app web está publicada con acceso "Cualquier usuario"?`);
  });
  if (!d.ok) throw new ErrorAppsScript(String(d.error));
  return d.datos as T;
}
