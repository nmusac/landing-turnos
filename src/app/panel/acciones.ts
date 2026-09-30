"use server";

import { revalidatePath } from "next/cache";
import { notFound, redirect } from "next/navigation";
import type { Negocio } from "@/negocio.config";
import { programarAvisos } from "@/lib/aviso";
import { buscarServicio, profesionalesPara } from "@/lib/disponibilidad";
import { rutaBase } from "@/lib/formato";
import { resolverNegocio } from "@/lib/negocio";
import { cerrarSesion, exigirSesion, iniciarSesion, pinCorrecto } from "@/lib/sesion";
import { HorarioOcupado, store } from "@/lib/store";
import { aUtc, esFecha, esHora, sumarDias } from "@/lib/tiempo";
import { esEmail, texto } from "@/lib/validar";

// Todas las acciones reciben el slug en un campo oculto "negocio" ("" en un
// sitio de cliente, el del prospecto en una demo).

export type Estado = { tipo: "ok" | "error"; mensaje: string } | null;

async function negocioDe(datos: FormData): Promise<Negocio> {
  const n = await resolverNegocio(String(datos.get("negocio") ?? "") || null);
  if (!n) notFound();
  return n;
}

/** Negocio del formulario, exigiendo que haya sesión iniciada. */
async function conSesion(datos: FormData) {
  const n = await negocioDe(datos);
  const panel = `${rutaBase(n)}/panel`;
  await exigirSesion(`${panel}/ingresar`);
  return { n, panel };
}

export async function ingresar(_: string | null, datos: FormData): Promise<string | null> {
  const n = await negocioDe(datos);
  const pin = String(datos.get("pin") ?? "");
  if (!pinCorrecto(pin)) {
    // Frena un poco los intentos en serie.
    await new Promise((r) => setTimeout(r, 800));
    return "PIN incorrecto.";
  }
  await iniciarSesion();
  redirect(`${rutaBase(n)}/panel`);
}

export async function salir(datos: FormData) {
  const n = await negocioDe(datos);
  await cerrarSesion();
  redirect(`${rutaBase(n)}/panel/ingresar`);
}

export async function cancelarReserva(datos: FormData) {
  const { n, panel } = await conSesion(datos);
  const reserva = await store(n.slug).cancelarReserva(String(datos.get("id")));
  if (reserva) await programarAvisos(n, "reserva.cancelada", reserva);
  revalidatePath(panel);
}

/** Turno de un cliente que reservó por teléfono o en persona. */
export async function agregarTurno(_: Estado, datos: FormData): Promise<Estado> {
  const { n, panel } = await conSesion(datos);
  const error = (mensaje: string): Estado => ({ tipo: "error", mensaje });

  const servicio = buscarServicio(n, datos.get("servicio"));
  const fecha = datos.get("fecha");
  const hora = datos.get("hora");
  const nombre = texto(datos.get("nombre"), 80);
  const telefono = texto(datos.get("telefono"), 30) || null;
  const email = texto(datos.get("email"), 120).toLowerCase() || null;
  const profesional = String(datos.get("profesional") ?? "");

  if (nombre.length < 2) return error("Escribí el nombre del cliente.");
  if (!servicio) return error("Elegí un servicio.");
  if (!esFecha(fecha) || !esHora(hora)) return error("Elegí el día y la hora.");
  if (email && !esEmail(email)) return error("Revisá el email, o dejalo vacío.");

  const inicio = aUtc(fecha, hora, n.zonaHoraria);
  const fin = new Date(inicio.getTime() + servicio.duracion * 60000);
  // El local decide: se permite fuera del horario de atención, pero nunca encima de otro turno.
  const candidatos = profesionalesPara(n, servicio.id).filter((p) => !profesional || p.id === profesional);
  if (!candidatos.length) return error("Esa persona no hace ese servicio.");

  for (const p of candidatos) {
    try {
      const reserva = await store(n.slug).crearReserva({
        profesionalId: p.id,
        servicioId: servicio.id,
        inicio: inicio.toISOString(),
        fin: fin.toISOString(),
        nombre,
        telefono,
        email,
        nota: null,
        origen: "local",
      });
      await programarAvisos(n, "reserva.creada", reserva);
      revalidatePath(panel);
      const con = n.profesionales.length > 1 ? ` con ${p.nombre}` : "";
      return { tipo: "ok", mensaje: `Listo: ${nombre}, ${hora}${con}.${email ? " Le mandamos la confirmación por email." : ""}` };
    } catch (e) {
      if (!(e instanceof HorarioOcupado)) throw e;
    }
  }
  return error(
    candidatos.length === 1 && n.profesionales.length > 1
      ? `${candidatos[0].nombre} ya tiene un turno que se superpone con ese horario.`
      : "Ya hay un turno que se superpone con ese horario.",
  );
}

export async function bloquear(_: Estado, datos: FormData): Promise<Estado> {
  const { n, panel } = await conSesion(datos);
  const fecha = datos.get("fecha");
  const diaCompleto = datos.get("dia-completo") === "on";
  const desde = diaCompleto ? "00:00" : datos.get("desde");
  const hasta = diaCompleto ? "00:00" : datos.get("hasta");
  if (!esFecha(fecha) || !esHora(desde) || !esHora(hasta)) return { tipo: "error", mensaje: "Elegí el día y el horario." };

  const inicio = aUtc(fecha, desde, n.zonaHoraria);
  const fin = aUtc(diaCompleto ? sumarDias(fecha, 1) : fecha, hasta, n.zonaHoraria);
  if (fin <= inicio) return { tipo: "error", mensaje: "La hora de fin tiene que ser posterior a la de inicio." };

  const profesional = String(datos.get("profesional") ?? "");
  await store(n.slug).crearBloqueo({
    profesionalId: n.profesionales.some((p) => p.id === profesional) ? profesional : null,
    inicio: inicio.toISOString(),
    fin: fin.toISOString(),
    motivo: texto(datos.get("motivo"), 100) || null,
  });
  revalidatePath(panel);
  return { tipo: "ok", mensaje: "Horario bloqueado." };
}

export async function desbloquear(datos: FormData) {
  const { n, panel } = await conSesion(datos);
  await store(n.slug).borrarBloqueo(String(datos.get("id")));
  revalidatePath(panel);
}
