import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Cliente de Supabase del servidor (clave secreta). Las tablas tienen RLS sin
// políticas: el navegador nunca habla con Supabase.

export const supabaseConfigurado = () => !!(process.env.SUPABASE_URL && process.env.SUPABASE_SECRET_KEY);

let cliente: SupabaseClient | undefined;

export function supabase(): SupabaseClient {
  const { SUPABASE_URL, SUPABASE_SECRET_KEY } = process.env;
  if (!SUPABASE_URL || !SUPABASE_SECRET_KEY) throw new Error("Faltan SUPABASE_URL y SUPABASE_SECRET_KEY");
  return (cliente ??= createClient(SUPABASE_URL, SUPABASE_SECRET_KEY, { auth: { persistSession: false } }));
}
