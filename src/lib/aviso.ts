import "server-only";
import { after } from "next/server";
import { headers } from "next/headers";
import type { Negocio } from "@/negocio.config";
import { buscarServicio } from "./disponibilidad";
import { enviarEmail, type Email } from "./email";
import { linkCalendario, linkWhatsapp, rutaBase } from "./formato";
import type { Reserva } from "./store";
import { fechaLarga, fechaLocal, horaLocal } from "./tiempo";

// Único punto de avisos. Por cada evento:
// - webhook a n8n (N8N_WEBHOOK_URL), si está configurado;
// - emails: reserva web → al local y al cliente; cargada por el local → al
//   cliente (si dejó email); cancelación → al cliente.
// Todo corre después de responder (after), así el cliente no espera.

type Evento = "reserva.creada" | "reserva.cancelada";

export async function programarAvisos(n: Negocio, evento: Evento, r: Reserva) {
  const sitio = await urlSitio();
  after(async () => {
    const tareas = [webhook(n, evento, r), ...emails(n, evento, r, sitio).map(enviarEmail)];
    for (const resultado of await Promise.allSettled(tareas)) {
      if (resultado.status === "rejected") console.error(`Aviso ${evento} fallido`, resultado.reason);
    }
  });
}

async function urlSitio() {
  if (process.env.SITIO_URL) return process.env.SITIO_URL.replace(/\/$/, "");
  const h = await headers();
  return `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host")}`;
}

function datos(n: Negocio, r: Reserva) {
  const inicio = new Date(r.inicio);
  const servicio = buscarServicio(n, r.servicioId);
  return {
    fecha: fechaLocal(inicio, n.zonaHoraria),
    hora: horaLocal(inicio, n.zonaHoraria),
    servicio,
    nombreServicio: servicio?.nombre ?? r.servicioId,
    profesional: n.profesionales.find((p) => p.id === r.profesionalId)?.nombre ?? r.profesionalId,
  };
}

async function webhook(n: Negocio, evento: Evento, r: Reserva) {
  const url = process.env.N8N_WEBHOOK_URL;
  if (!url) return;
  const d = datos(n, r);
  await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(process.env.N8N_WEBHOOK_SECRET ? { "x-webhook-secret": process.env.N8N_WEBHOOK_SECRET } : {}),
    },
    body: JSON.stringify({
      evento,
      negocio: { slug: n.slug, nombre: n.nombre, whatsapp: n.whatsapp ?? null, email: n.emailAvisos || null, demo: !!n.esDemo },
      reserva: {
        id: r.id,
        fecha: d.fecha,
        hora: d.hora,
        inicio: r.inicio,
        fin: r.fin,
        servicio: d.nombreServicio,
        profesional: d.profesional,
        cliente: { nombre: r.nombre, telefono: r.telefono, email: r.email },
        nota: r.nota,
        origen: r.origen,
      },
    }),
    signal: AbortSignal.timeout(8000),
  });
}

// ---------- Emails ----------

const escapar = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

const boton = (href: string, texto: string, n: Negocio) =>
  `<a href="${escapar(href)}" style="display:inline-block;background:${n.tema.acento};color:${n.tema.sobreAcento};padding:12px 20px;text-decoration:none;font-weight:600">${escapar(texto)}</a>`;

const plantilla = (n: Negocio, titulo: string, cuerpo: string) => `
<div style="font-family:Arial,Helvetica,sans-serif;max-width:520px;color:#17241F;line-height:1.5">
  <p style="margin:0 0 4px;color:#56655F">${escapar(n.nombre)}</p>
  <h1 style="margin:0 0 16px;font-size:24px">${escapar(titulo)}</h1>
  ${cuerpo}
  <p style="margin-top:32px;color:#56655F;font-size:13px">${escapar([n.direccion, n.ciudad].filter(Boolean).join(", "))}</p>
</div>`;

const tabla = (filas: [string, string | null | undefined][]) =>
  `<table style="border-collapse:collapse;margin:0 0 20px">${filas
    .filter(([, v]) => v)
    .map(
      ([k, v]) =>
        `<tr><td style="padding:4px 16px 4px 0;color:#56655F;vertical-align:top">${escapar(k)}</td><td style="padding:4px 0">${escapar(v!)}</td></tr>`,
    )
    .join("")}</table>`;

function emails(n: Negocio, evento: Evento, r: Reserva, sitio: string): Email[] {
  const d = datos(n, r);
  const cuando = `${fechaLarga(d.fecha)} a las ${d.hora}`;
  const base = { remitente: n.nombre };
  const contactoLocal = n.email || n.emailAvisos || undefined;
  const lista: Email[] = [];

  if (evento === "reserva.creada" && r.origen === "web" && n.emailAvisos) {
    lista.push({
      ...base,
      para: n.emailAvisos,
      responderA: r.email ?? undefined,
      asunto: `Nuevo turno: ${r.nombre}, ${cuando}`,
      html: plantilla(
        n,
        `Nuevo turno para el ${cuando}`,
        tabla([
          ["Cliente", r.nombre],
          ["Servicio", d.nombreServicio],
          ["Con", n.profesionales.length > 1 ? d.profesional : null],
          ["Celular", r.telefono],
          ["Email", r.email],
          ["Nota", r.nota],
        ]) + boton(`${sitio}${rutaBase(n)}/panel?dia=${d.fecha}`, "Ver la agenda", n),
      ),
    });
  }

  if (evento === "reserva.creada" && r.email) {
    const cambios = n.whatsapp
      ? `<p>Si necesitás cambiarlo, respondé este email o <a href="${escapar(linkWhatsapp(n.whatsapp))}">escribinos por WhatsApp</a>.</p>`
      : `<p>Si necesitás cambiarlo, respondé este email${n.telefono ? ` o llamanos al ${escapar(n.telefono)}` : ""}.</p>`;
    lista.push({
      ...base,
      para: r.email,
      responderA: contactoLocal,
      asunto: `Tu turno en ${n.nombre}: ${cuando}`,
      html: plantilla(
        n,
        `Te esperamos el ${cuando}`,
        `<p>Hola ${escapar(r.nombre.split(" ")[0])}, tu turno quedó confirmado.</p>` +
          tabla([
            ["Servicio", d.nombreServicio],
            ["Con", n.profesionales.length > 1 ? d.profesional : null],
            ["Dónde", [n.direccion, n.ciudad].filter(Boolean).join(", ")],
          ]) +
          (d.servicio ? boton(linkCalendario(n, d.servicio, d.fecha, d.hora), "Agregar a mi calendario", n) : "") +
          cambios,
      ),
    });
  }

  if (evento === "reserva.cancelada" && r.email) {
    lista.push({
      ...base,
      para: r.email,
      responderA: contactoLocal,
      asunto: `Cancelamos tu turno del ${cuando}`,
      html: plantilla(
        n,
        "Tu turno fue cancelado",
        `<p>Hola ${escapar(r.nombre.split(" ")[0])}, ${escapar(n.nombre)} tuvo que cancelar tu turno de ${escapar(
          d.nombreServicio.toLowerCase(),
        )} del ${escapar(cuando)}. Disculpá las molestias.</p><p>Podés elegir otro horario acá:</p>` +
          boton(`${sitio}${rutaBase(n)}/#reservar`, "Reservar otro turno", n),
      ),
    });
  }

  return lista;
}
