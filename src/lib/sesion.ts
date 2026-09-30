import "server-only";
import { createHash, createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

// Sesión del panel: una cookie firmada con la fecha de vencimiento.
// No hay usuarios: el local entra con el PIN de PANEL_PIN.

const COOKIE = "panel";
const DURACION_DIAS = 30;

/** Falta una variable de entorno del panel: se muestra tal cual en la pantalla del PIN. */
export class ErrorConfiguracion extends Error {}

function secreto() {
  const s = process.env.SESSION_SECRET?.trim();
  if (!s || s.length < 32) {
    throw new ErrorConfiguracion("falta SESSION_SECRET en el servidor, o tiene menos de 32 caracteres");
  }
  return s;
}

const firmar = (valor: string) => createHmac("sha256", secreto()).update(valor).digest("base64url");

const iguales = (a: string, b: string) => {
  const ha = createHash("sha256").update(a).digest();
  const hb = createHash("sha256").update(b).digest();
  return timingSafeEqual(ha, hb);
};

export function pinCorrecto(pin: string): boolean {
  const esperado = process.env.PANEL_PIN?.trim();
  if (!esperado) throw new ErrorConfiguracion("falta PANEL_PIN en el servidor");
  return iguales(pin, esperado);
}

export async function iniciarSesion() {
  const vence = Date.now() + DURACION_DIAS * 86400000;
  (await cookies()).set(COOKIE, `${vence}.${firmar(String(vence))}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: DURACION_DIAS * 86400,
  });
}

export async function cerrarSesion() {
  (await cookies()).delete(COOKIE);
}

export async function sesionValida(): Promise<boolean> {
  const valor = (await cookies()).get(COOKIE)?.value;
  if (!valor) return false;
  const [vence, firma] = valor.split(".");
  return !!firma && iguales(firma, firmar(vence)) && Number(vence) > Date.now();
}

/** Para páginas y acciones del panel: sin sesión, al formulario de PIN. */
export async function exigirSesion(rutaIngresar: string) {
  if (!(await sesionValida())) redirect(rutaIngresar);
}
