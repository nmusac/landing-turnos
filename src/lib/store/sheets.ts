// Backend provisorio: una planilla de Google con el Apps Script de
// google-sheets/Code.gs publicado como aplicación web.
import { ErrorAppsScript, llamarAppsScript } from "../appsScript";
import { fechaLocal, horaLocal } from "../tiempo";
import { HorarioOcupado, type Bloqueo, type Reserva, type Store } from "./tipos";

type Fila = Record<string, string>;

const aReserva = (f: Fila): Reserva => ({
  id: f.id,
  profesionalId: f.profesional_id,
  servicioId: f.servicio_id,
  inicio: f.inicio,
  fin: f.fin,
  nombre: f.cliente_nombre,
  telefono: f.cliente_telefono || null,
  email: f.cliente_email || null,
  nota: f.nota || null,
  // Las filas anteriores a la columna "origen" vinieron todas de la web.
  origen: f.origen === "local" ? "local" : "web",
  estado: f.estado as Reserva["estado"],
  creada: f.creada,
});

const aBloqueo = (f: Fila): Bloqueo => ({
  id: f.id,
  profesionalId: f.profesional_id || null,
  inicio: f.inicio,
  fin: f.fin,
  motivo: f.motivo || null,
});

export function storeSheets(slug: string, zona: string): Store {
  const llamar = <T>(accion: string, datos: object = {}) => llamarAppsScript<T>(accion, { negocio: slug, ...datos });

  return {
    async ocupacionesEntre(desde, hasta) {
      const d = await llamar<{ reservas: Fila[]; bloqueos: Fila[] }>("ocupaciones", {
        desde: desde.toISOString(),
        hasta: hasta.toISOString(),
      });
      return { reservas: d.reservas.map(aReserva), bloqueos: d.bloqueos.map(aBloqueo) };
    },
    async crearReserva(r) {
      const inicio = new Date(r.inicio);
      try {
        const fila = await llamar<Fila>("crearReserva", {
          reserva: {
            // fecha y hora locales solo para que el dueño lea la planilla cómodo.
            fecha: fechaLocal(inicio, zona),
            hora: horaLocal(inicio, zona),
            profesional_id: r.profesionalId,
            servicio_id: r.servicioId,
            cliente_nombre: r.nombre,
            cliente_telefono: r.telefono,
            cliente_email: r.email,
            nota: r.nota,
            origen: r.origen,
            inicio: r.inicio,
            fin: r.fin,
          },
        });
        return aReserva(fila);
      } catch (e) {
        if (e instanceof ErrorAppsScript && e.message === "ocupado") throw new HorarioOcupado();
        throw e;
      }
    },
    async cancelarReserva(id) {
      const fila = await llamar<Fila | null>("cancelarReserva", { id });
      return fila ? aReserva(fila) : null;
    },
    async crearBloqueo(b) {
      return aBloqueo(
        await llamar<Fila>("crearBloqueo", {
          bloqueo: { profesional_id: b.profesionalId, inicio: b.inicio, fin: b.fin, motivo: b.motivo },
        }),
      );
    },
    async borrarBloqueo(id) {
      await llamar("borrarBloqueo", { id });
    },
  };
}
