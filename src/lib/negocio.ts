import "server-only";
import { cookies } from "next/headers";
import { negocio as base, type Negocio } from "@/negocio.config";
import { appsScriptConfigurado, llamarAppsScript } from "./appsScript";
import { COOKIE_ESTILO, esEstilo, type Estilo } from "./estilos";
import { negocioDesdeProspecto, type FilaProspecto } from "./prospecto";

/** Las rutas /demo/* solo existen en el sitio de demos de la agencia (DEMOS=1). */
export const demosActivas = () => process.env.DEMOS === "1";

// Se guarda la promesa de la fila, no el resultado: el título y la página de una
// demo se arman a la vez y así comparten una sola lectura de la planilla. Se
// guarda la fila (y no el negocio armado) porque cada estilo la arma distinto.
const cache = new Map<string, { vence: number; valor: Promise<FilaProspecto | null> }>();
const DURACION_CACHE = 60_000;

async function leerFila(slug: string): Promise<FilaProspecto | null> {
  // Apps Script a veces falla una vez sin motivo; se reintenta antes de mostrar un error.
  for (let intento = 1; ; intento++) {
    try {
      return await llamarAppsScript<FilaProspecto | null>("prospecto", { slug });
    } catch (e) {
      if (intento >= 2) throw e;
      await new Promise((r) => setTimeout(r, 500));
    }
  }
}

function filaProspecto(slug: string): Promise<FilaProspecto | null> {
  const guardado = cache.get(slug);
  if (guardado && guardado.vence > Date.now()) return guardado.valor;
  const valor = leerFila(slug);
  cache.set(slug, { vence: Date.now() + DURACION_CACHE, valor });
  // Un error no queda guardado: la próxima visita vuelve a intentar.
  valor.catch(() => cache.delete(slug));
  return valor;
}

/**
 * Estilo pedido para una demo: `?estilo=` en la URL (links compartidos) o, si no
 * hay, el último elegido en la barrita de esa demo (cookie). Sin ninguno, la
 * demo usa el de su fila o el que corresponde a su rubro.
 */
export async function estiloDemo(pedido: unknown): Promise<Estilo | undefined> {
  if (esEstilo(pedido)) return pedido;
  const guardado = (await cookies()).get(COOKIE_ESTILO)?.value;
  return esEstilo(guardado) ? guardado : undefined;
}

/**
 * Sin slug: el negocio de este sitio. Con slug: la demo de ese prospecto, o null
 * si no existe. `estilo` es el elegido en el selector de la demo (opcional).
 */
export async function resolverNegocio(slug?: string | null, estilo?: Estilo): Promise<Negocio | null> {
  if (!slug) return base;
  if (!demosActivas() || !appsScriptConfigurado() || !/^[a-z0-9-]{1,80}$/.test(slug)) return null;
  const fila = await filaProspecto(slug);
  return fila ? negocioDesdeProspecto(fila, base, estilo) : null;
}
