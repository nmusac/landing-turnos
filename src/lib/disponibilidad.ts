import type { Negocio, Profesional, Servicio } from "@/negocio.config";
import { aHora, aMinutos, aUtc, diaSemana, fechaLocal, sumarDias } from "./tiempo";

export type Ocupacion = { profesionalId: string | null; inicio: string; fin: string };
export type Turno = { hora: string; libres: string[] }; // ids de profesionales libres

export const buscarServicio = (n: Negocio, id: unknown) => n.servicios.find((s) => s.id === id);

/** Los que se pueden reservar online; el resto se muestran con "Consultar". */
export const serviciosReservables = (n: Negocio) => n.servicios.filter((s) => s.reservable !== false);

export const buscarServicioReservable = (n: Negocio, id: unknown) => serviciosReservables(n).find((s) => s.id === id);

export const profesionalesPara = (n: Negocio, servicioId: string): Profesional[] =>
  n.profesionales.filter((p) => !p.servicios || p.servicios.includes(servicioId));

export const hoyLocal = (n: Negocio, ahora = new Date()) => fechaLocal(ahora, n.zonaHoraria);

export function fechaReservable(n: Negocio, fecha: string, ahora = new Date()): boolean {
  const hoy = hoyLocal(n, ahora);
  return fecha >= hoy && fecha <= sumarDias(hoy, n.turnos.diasAdelante);
}

/** Turnos de un día para un servicio, con qué profesionales quedan libres en cada uno. */
export function turnosDelDia(
  n: Negocio,
  fecha: string,
  servicio: Servicio,
  candidatos: Profesional[],
  ocupaciones: Ocupacion[],
  ahora: Date,
): Turno[] {
  const { zonaHoraria: zona, turnos } = n;
  // Sin anticipación mínima igual se exige que el turno no haya empezado.
  const limite = ahora.getTime() + turnos.anticipacionMinima * 60000;
  const ocupadas = ocupaciones.map((o) => ({
    profesionalId: o.profesionalId,
    inicio: new Date(o.inicio).getTime(),
    fin: new Date(o.fin).getTime(),
  }));
  const resultado: Turno[] = [];

  for (const [abre, cierra] of n.horarios[diaSemana(fecha)] ?? []) {
    for (let m = aMinutos(abre); m + servicio.duracion <= aMinutos(cierra); m += turnos.intervalo) {
      const hora = aHora(m);
      const inicio = aUtc(fecha, hora, zona).getTime();
      if (inicio <= limite) continue;
      const fin = inicio + servicio.duracion * 60000;
      const libres = candidatos
        .filter(
          (p) =>
            !ocupadas.some(
              (o) => (o.profesionalId === null || o.profesionalId === p.id) && o.inicio < fin && o.fin > inicio,
            ),
        )
        .map((p) => p.id);
      if (libres.length) resultado.push({ hora, libres });
    }
  }
  return resultado;
}
