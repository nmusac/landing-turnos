import "server-only";
import { negocio as base, type Negocio } from "@/negocio.config";
import { appsScriptConfigurado, llamarAppsScript } from "./appsScript";
import { negocioDesdeProspecto, type FilaProspecto } from "./prospecto";

/** Las rutas /demo/* solo existen en el sitio de demos de la agencia (DEMOS=1). */
export const demosActivas = () => process.env.DEMOS === "1";

const cache = new Map<string, { vence: number; valor: Negocio | null }>();
const DURACION_CACHE = 60_000;

async function negocioDemo(slug: string): Promise<Negocio | null> {
  const guardado = cache.get(slug);
  if (guardado && guardado.vence > Date.now()) return guardado.valor;
  const fila = await llamarAppsScript<FilaProspecto | null>("prospecto", { slug });
  const valor = fila ? negocioDesdeProspecto(fila, base) : null;
  cache.set(slug, { vence: Date.now() + DURACION_CACHE, valor });
  return valor;
}

/** Sin slug: el negocio de este sitio. Con slug: la demo de ese prospecto, o null si no existe. */
export async function resolverNegocio(slug?: string | null): Promise<Negocio | null> {
  if (!slug) return base;
  if (!demosActivas() || !appsScriptConfigurado() || !/^[a-z0-9-]{1,80}$/.test(slug)) return null;
  return negocioDemo(slug);
}
