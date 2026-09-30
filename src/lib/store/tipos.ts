export type Reserva = {
  id: string;
  profesionalId: string;
  servicioId: string;
  inicio: string; // ISO UTC
  fin: string; // ISO UTC
  nombre: string;
  telefono: string | null; // obligatorio desde la web; opcional si lo carga el local
  email: string | null;
  nota: string | null;
  origen: "web" | "local"; // "local" = cargado a mano desde el panel
  estado: "confirmada" | "cancelada";
  creada: string;
};

export type NuevaReserva = Omit<Reserva, "id" | "estado" | "creada">;

export type Bloqueo = {
  id: string;
  profesionalId: string | null; // null = todo el local
  inicio: string;
  fin: string;
  motivo: string | null;
};

export type NuevoBloqueo = Omit<Bloqueo, "id">;

export type Ocupaciones = { reservas: Reserva[]; bloqueos: Bloqueo[] };

/** El horario ya lo tomó otra reserva confirmada. */
export class HorarioOcupado extends Error {
  constructor() {
    super("horario ocupado");
  }
}

export interface Store {
  /** Reservas confirmadas y bloqueos que se superponen con el rango, en una sola lectura. */
  ocupacionesEntre(desde: Date, hasta: Date): Promise<Ocupaciones>;
  crearReserva(r: NuevaReserva): Promise<Reserva>;
  /** Devuelve la reserva cancelada, o null si no existía o ya estaba cancelada. */
  cancelarReserva(id: string): Promise<Reserva | null>;
  crearBloqueo(b: NuevoBloqueo): Promise<Bloqueo>;
  borrarBloqueo(id: string): Promise<void>;
}

export const seSuperponen = (a: { inicio: string; fin: string }, desde: Date, hasta: Date) =>
  new Date(a.inicio) < hasta && new Date(a.fin) > desde;
