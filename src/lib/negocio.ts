import "server-only";
import { negocio as base, type Negocio } from "@/negocio.config";
import { appsScriptConfigurado, llamarAppsScript } from "./appsScript";
import { negocioDesdeProspecto, type FilaProspecto } from "./prospecto";

/** Las rutas /demo/* solo existen en el sitio de demos de la agencia (DEMOS=1). */
export const demosActivas = () => process.env.DEMOS === "1";

// Se guarda la promesa, no el resultado: el título y la página de una demo se
// arman a la vez y así comparten una sola lectura de la planilla.
const cache = new Map<string, { vence: number; valor: Promise<Negocio | null> }>();
const DURACION_CACHE = 60_000;

async function leerProspecto(slug: string): Promise<Negocio | null> {
  // Apps Script a veces falla una vez sin motivo; se reintenta antes de mostrar un error.
  for (let intento = 1; ; intento++) {
    try {
      const fila = await llamarAppsScript<FilaProspecto | null>("prospecto", { slug });
      return fila ? negocioDesdeProspecto(fila, base) : null;
    } catch (e) {
      if (intento >= 2) throw e;
      await new Promise((r) => setTimeout(r, 500));
    }
  }
}

function negocioDemo(slug: string): Promise<Negocio | null> {
  const guardado = cache.get(slug);
  if (guardado && guardado.vence > Date.now()) return guardado.valor;
  const valor = leerProspecto(slug);
  cache.set(slug, { vence: Date.now() + DURACION_CACHE, valor });
  // Un error no queda guardado: la próxima visita vuelve a intentar.
  valor.catch(() => cache.delete(slug));
  return valor;
}

/** Sin slug: el negocio de este sitio. Con slug: la demo de ese prospecto, o null si no existe. */
export async function resolverNegocio(slug?: string | null): Promise<Negocio | null> {
  if (!slug) return base;
  if (!demosActivas() || !appsScriptConfigurado() || !/^[a-z0-9-]{1,80}$/.test(slug)) return null;
  return negocioDemo(slug);
}
