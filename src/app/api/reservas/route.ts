import { NextResponse } from "next/server";
import { turnosLibres } from "@/lib/agenda";
import { programarAvisos } from "@/lib/aviso";
import { buscarServicioReservable, fechaReservable } from "@/lib/disponibilidad";
import { resolverNegocio } from "@/lib/negocio";
import { HorarioOcupado, store } from "@/lib/store";
import { aUtc, esFecha, esHora } from "@/lib/tiempo";
import { esEmail, texto } from "@/lib/validar";

const error = (mensaje: string, status = 400) => NextResponse.json({ error: mensaje }, { status });

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") return error("Pedido inválido");

  // Campo trampa: invisible para personas, los bots lo completan.
  if (texto(body.sitio, 200)) return NextResponse.json({ ok: true });

  const n = await resolverNegocio(typeof body.negocio === "string" ? body.negocio : null);
  if (!n) return error("Negocio inexistente", 404);

  const servicio = buscarServicioReservable(n, body.servicio);
  const { fecha, hora } = body;
  const profesional = typeof body.profesional === "string" && body.profesional ? body.profesional : null;
  const nombre = texto(body.nombre, 80);
  const telefono = texto(body.telefono, 30);
  const email = texto(body.email, 120).toLowerCase();
  const nota = texto(body.nota, 300) || null;

  if (!servicio) return error("Elegí un servicio.");
  if (!esFecha(fecha) || !esHora(hora) || !fechaReservable(n, fecha)) return error("Elegí un día y una hora.");
  if (nombre.length < 2) return error("Escribí tu nombre.");
  if (telefono.replace(/\D/g, "").length < 8) return error("Revisá el teléfono: tiene que tener al menos 8 números.");
  if (!esEmail(email)) return error("Revisá el email: ahí te mandamos la confirmación.");

  // Se recalcula del lado del servidor: no confiamos en lo que muestra el navegador.
  const turno = (await turnosLibres(n, fecha, servicio, profesional)).find((t) => t.hora === hora);
  if (!turno) return error("Ese horario ya no está disponible. Elegí otro.", 409);

  const inicio = aUtc(fecha, hora, n.zonaHoraria);
  const fin = new Date(inicio.getTime() + servicio.duracion * 60000);

  // Si eligió "cualquiera", se prueba con cada profesional libre por si otro
  // cliente confirmó al mismo tiempo.
  for (const profesionalId of turno.libres) {
    try {
      const reserva = await store(n.slug).crearReserva({
        profesionalId,
        servicioId: servicio.id,
        inicio: inicio.toISOString(),
        fin: fin.toISOString(),
        nombre,
        telefono,
        email,
        nota,
        origen: "web",
      });
      await programarAvisos(n, "reserva.creada", reserva);
      return NextResponse.json({ ok: true, reserva: { id: reserva.id, profesional: profesionalId } });
    } catch (e) {
      if (!(e instanceof HorarioOcupado)) throw e;
    }
  }
  return error("Ese horario se acaba de ocupar. Elegí otro.", 409);
}
