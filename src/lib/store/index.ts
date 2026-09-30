import "server-only";
import { negocio as base } from "@/negocio.config";
import { appsScriptConfigurado } from "../appsScript";
import { storeLocal } from "./local";
import { storeSheets } from "./sheets";
import { storeSupabase } from "./supabase";
import type { Store } from "./tipos";

export * from "./tipos";

// Supabase si está configurado; si no, Google Sheets (provisorio); si no,
// un archivo local, solo en desarrollo. Cada negocio (o demo) usa su slug.
function crear(slug: string): Store {
  const { SUPABASE_URL, SUPABASE_SECRET_KEY } = process.env;
  if (SUPABASE_URL && SUPABASE_SECRET_KEY) return storeSupabase(slug, SUPABASE_URL, SUPABASE_SECRET_KEY);
  if (appsScriptConfigurado()) return storeSheets(slug, base.zonaHoraria);
  if (process.env.NODE_ENV === "production") {
    throw new Error("Falta configurar Google Sheets (GOOGLE_SHEETS_URL/SECRET) o Supabase (SUPABASE_URL/SECRET_KEY)");
  }
  return storeLocal(slug);
}

const instancias = new Map<string, Store>();

export function store(slug: string): Store {
  let s = instancias.get(slug);
  if (!s) instancias.set(slug, (s = crear(slug)));
  return s;
}
