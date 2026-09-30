import { NextResponse, type NextRequest } from "next/server";
import { turnosLibres, proximosTurnos } from "@/lib/agenda";
import { buscarServicioReservable, fechaReservable, hoyLocal, profesionalesPara } from "@/lib/disponibilidad";
import { resolverNegocio } from "@/lib/negocio";
import { esFecha } from "@/lib/tiempo";

// GET /api/turnos?servicio=corte&fecha=2026-10-02[&profesional=hector][&negocio=<slug de demo>]
// GET /api/turnos?servicio=corte&proximos=6
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams;
  const n = await resolverNegocio(q.get("negocio"));
  if (!n) return NextResponse.json({ error: "Negocio inexistente" }, { status: 404 });

  const servicio = buscarServicioReservable(n, q.get("servicio"));
  if (!servicio) return NextResponse.json({ error: "Servicio inexistente" }, { status: 400 });

  const proximos = Number(q.get("proximos"));
  if (proximos) {
    return NextResponse.json({ proximos: await proximosTurnos(n, servicio, hoyLocal(n), Math.min(proximos, 12)) });
  }

  const fecha = q.get("fecha");
  if (!esFecha(fecha) || !fechaReservable(n, fecha)) {
    return NextResponse.json({ error: "Fecha fuera de rango" }, { status: 400 });
  }
  const profesional = q.get("profesional");
  if (profesional && !profesionalesPara(n, servicio.id).some((p) => p.id === profesional)) {
    return NextResponse.json({ error: "Profesional inexistente" }, { status: 400 });
  }
  return NextResponse.json({ turnos: await turnosLibres(n, fecha, servicio, profesional) });
}
