import "server-only";
import type { Negocio, Servicio } from "@/negocio.config";
import { profesionalesPara, turnosDelDia, type Ocupacion, type Turno } from "./disponibilidad";
import { store } from "./store";
import { aUtc, sumarDias } from "./tiempo";

export const inicioDelDia = (n: Negocio, fecha: string) => aUtc(fecha, "00:00", n.zonaHoraria);

/** Reservas y bloqueos entre dos fechas locales (inclusive), en una sola lectura. */
export async function ocupacionesEntreFechas(n: Negocio, desdeFecha: string, hastaFecha: string) {
  return store(n.slug).ocupacionesEntre(inicioDelDia(n, desdeFecha), inicioDelDia(n, sumarDias(hastaFecha, 1)));
}

async function ocupaciones(n: Negocio, desdeFecha: string, hastaFecha: string): Promise<Ocupacion[]> {
  const { reservas, bloqueos } = await ocupacionesEntreFechas(n, desdeFecha, hastaFecha);
  return [...reservas, ...bloqueos];
}

function candidatos(n: Negocio, servicio: Servicio, profesionalId: string | null) {
  const todos = profesionalesPara(n, servicio.id);
  return profesionalId ? todos.filter((p) => p.id === profesionalId) : todos;
}

export async function turnosLibres(
  n: Negocio,
  fecha: string,
  servicio: Servicio,
  profesionalId: string | null,
): Promise<Turno[]> {
  return turnosDelDia(n, fecha, servicio, candidatos(n, servicio, profesionalId), await ocupaciones(n, fecha, fecha), new Date());
}

/** Los próximos turnos libres, recorriendo días hasta juntar `cantidad`. */
export async function proximosTurnos(n: Negocio, servicio: Servicio, desde: string, cantidad: number) {
  // Alcanza con una semana para encontrar los primeros turnos; así la lectura es chica.
  const hasta = sumarDias(desde, Math.min(7, n.turnos.diasAdelante));
  const ocup = await ocupaciones(n, desde, hasta);
  const ahora = new Date();
  const lista = candidatos(n, servicio, null);
  const resultado: { fecha: string; hora: string }[] = [];
  for (let fecha = desde; fecha <= hasta && resultado.length < cantidad; fecha = sumarDias(fecha, 1)) {
    for (const t of turnosDelDia(n, fecha, servicio, lista, ocup, ahora)) {
      resultado.push({ fecha, hora: t.hora });
      if (resultado.length === cantidad) break;
    }
  }
  return resultado;
}
