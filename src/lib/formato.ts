import type { CSSProperties } from "react";
import type { Horarios, Negocio, Servicio } from "@/negocio.config";
import { ESTILOS, temaDe } from "./estilos";
import { aUtc } from "./tiempo";

export const precio = (moneda: string, p: number | null) =>
  p === null ? "Consultar" : `${moneda} ${new Intl.NumberFormat("es-UY").format(p)}`;

export const duracion = (min: number) =>
  min < 60 ? `${min} min` : min % 60 ? `${Math.floor(min / 60)} h ${min % 60} min` : `${min / 60} h`;

const NOMBRES = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
const ORDEN = [1, 2, 3, 4, 5, 6, 0] as const;

const franjas = (f: [string, string][] | undefined) =>
  f?.length ? f.map(([a, c]) => `${a} a ${c}`).join(" y ") : "Cerrado";

/** Agrupa días consecutivos con el mismo horario: "Martes a jueves · 10:00 a 13:00 y 14:30 a 20:00". */
export function horariosAgrupados(h: Horarios) {
  const grupos: { dias: number[]; texto: string }[] = [];
  for (const d of ORDEN) {
    const texto = franjas(h[d]);
    const ultimo = grupos.at(-1);
    if (ultimo && ultimo.texto === texto) ultimo.dias.push(d);
    else grupos.push({ dias: [d], texto });
  }
  return grupos.map(({ dias, texto }) => ({
    dias:
      dias.length === 1
        ? NOMBRES[dias[0]]
        : dias.length === 2
          ? `${NOMBRES[dias[0]]} y ${NOMBRES[dias[1]].toLowerCase()}`
          : `${NOMBRES[dias[0]]} a ${NOMBRES[dias.at(-1)!].toLowerCase()}`,
    horario: texto,
  }));
}

export const linkWhatsapp = (numero: string, mensaje?: string) =>
  `https://wa.me/${numero}${mensaje ? `?text=${encodeURIComponent(mensaje)}` : ""}`;

/** Teléfono uruguayo como lo escribe la gente (099 123 456) → 59899123456 para WhatsApp. */
export const aWhatsapp = (tel: string) => {
  const d = tel.replace(/\D/g, "");
  return d.startsWith("598") ? d : `598${d.replace(/^0/, "")}`;
};

/** Link de "Agregar a Google Calendar" para un turno. */
export function linkCalendario(n: Negocio, servicio: Servicio, fecha: string, hora: string) {
  const inicio = aUtc(fecha, hora, n.zonaHoraria);
  const fin = new Date(inicio.getTime() + servicio.duracion * 60000);
  const f = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const q = new URLSearchParams({
    action: "TEMPLATE",
    text: `${servicio.nombre} en ${n.nombre}`,
    dates: `${f(inicio)}/${f(fin)}`,
    location: [n.direccion, n.ciudad].filter(Boolean).join(", "),
  });
  return `https://calendar.google.com/calendar/render?${q}`;
}

/** Prefijo de las rutas del negocio: "" en un sitio de cliente, "/demo/<slug>" en una demo. */
export const rutaBase = (n: Negocio) => (n.esDemo ? `/demo/${n.slug}` : "");

/** Variables CSS del estilo del negocio (colores y esquinas); se aplican junto a data-estilo. */
export function variablesTema(n: Negocio) {
  const t = temaDe(n);
  return {
    "--radio-boton": ESTILOS[n.estilo].radioBoton,
    "--radio-caja": ESTILOS[n.estilo].radioCaja,
    "--hero": t.hero,
    "--sobre-hero": t.sobreHero,
    "--fondo": t.fondo,
    "--superficie": t.superficie,
    "--texto": t.texto,
    "--suave": t.suave,
    "--linea": t.linea,
    "--acento": t.acento,
    "--sobre-acento": t.sobreAcento,
  } as CSSProperties;
}
