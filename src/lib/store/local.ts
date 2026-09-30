// Solo para desarrollo: guarda en .data/<slug>.json. En producción se usa Supabase.
import { promises as fs } from "fs";
import path from "path";
import { randomUUID } from "crypto";
import { HorarioOcupado, seSuperponen, type Bloqueo, type Reserva, type Store } from "./tipos";

type Datos = { reservas: Reserva[]; bloqueos: Bloqueo[] };

export function storeLocal(slug: string): Store {
  const archivo = path.join(process.cwd(), ".data", `${slug}.json`);
  let cola: Promise<unknown> = Promise.resolve();

  async function leer(): Promise<Datos> {
    try {
      return JSON.parse(await fs.readFile(archivo, "utf8"));
    } catch {
      return { reservas: [], bloqueos: [] };
    }
  }

  // Serializa las escrituras para que dos reservas simultáneas no se pisen.
  function conDatos<T>(fn: (d: Datos) => T): Promise<T> {
    const paso = cola.then(async () => {
      const d = await leer();
      const r = fn(d);
      await fs.mkdir(path.dirname(archivo), { recursive: true });
      await fs.writeFile(archivo, JSON.stringify(d, null, 2));
      return r;
    });
    cola = paso.catch(() => {});
    return paso;
  }

  return {
    async ocupacionesEntre(desde, hasta) {
      const d = await leer();
      return {
        reservas: d.reservas
          .filter((r) => r.estado === "confirmada" && seSuperponen(r, desde, hasta))
          .sort((a, b) => a.inicio.localeCompare(b.inicio)),
        bloqueos: d.bloqueos.filter((b) => seSuperponen(b, desde, hasta)),
      };
    },
    crearReserva(nueva) {
      return conDatos((d) => {
        const choca = d.reservas.some(
          (r) =>
            r.estado === "confirmada" &&
            r.profesionalId === nueva.profesionalId &&
            seSuperponen(r, new Date(nueva.inicio), new Date(nueva.fin)),
        );
        if (choca) throw new HorarioOcupado();
        const r: Reserva = { ...nueva, id: randomUUID(), estado: "confirmada", creada: new Date().toISOString() };
        d.reservas.push(r);
        return r;
      });
    },
    cancelarReserva(id) {
      return conDatos((d) => {
        const r = d.reservas.find((x) => x.id === id && x.estado === "confirmada");
        if (!r) return null;
        r.estado = "cancelada";
        return r;
      });
    },
    crearBloqueo(nuevo) {
      return conDatos((d) => {
        const b = { ...nuevo, id: randomUUID() };
        d.bloqueos.push(b);
        return b;
      });
    },
    async borrarBloqueo(id) {
      await conDatos((d) => {
        d.bloqueos = d.bloqueos.filter((b) => b.id !== id);
      });
    },
  };
}
