"use client";

import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import type { Negocio, Servicio } from "@/negocio.config";
import { profesionalesPara, serviciosReservables } from "@/lib/disponibilidad";
import { duracion, linkCalendario, linkWhatsapp, precio } from "@/lib/formato";
import { diaSemana, fechaCorta, fechaLarga, fechaLocal, sumarDias } from "@/lib/tiempo";
import { paramNegocio, useReserva } from "./Contexto";

type Turno = { hora: string; libres: string[] };
type Confirmada = { nombre: string; email: string; servicio: Servicio; profesional: string; fecha: string; hora: string };

const nombreProfesional = (n: Negocio, id: string) => n.profesionales.find((p) => p.id === id)?.nombre ?? "";

function diasAbiertos(n: Negocio, hoy: string) {
  const dias: string[] = [];
  for (let i = 0; i <= n.turnos.diasAdelante; i++) {
    const f = sumarDias(hoy, i);
    if (n.horarios[diaSemana(f)]?.length) dias.push(f);
  }
  return dias;
}

function Paso({ n, titulo, children, activo }: { n: number; titulo: string; children: ReactNode; activo: boolean }) {
  return (
    <li className={`grid grid-cols-[2.25rem_minmax(0,1fr)] gap-x-3 py-6 border-t border-linea ${activo ? "" : "opacity-45"}`}>
      <span className="subtitulo text-3xl tabular-nums text-suave" aria-hidden>
        {n}
      </span>
      <div>
        <h3 className="subtitulo text-2xl">{titulo}</h3>
        <div className="mt-4">{children}</div>
      </div>
    </li>
  );
}

const opcion = (elegida: boolean) =>
  `rounded-(--radio-caja) border px-3 py-2 text-left ${elegida ? "border-texto bg-texto text-superficie" : "border-linea bg-superficie hover:border-texto"}`;

export function Reservar() {
  const { negocio, sel, setSel } = useReserva();
  const [hoy] = useState(() => fechaLocal(new Date(), negocio.zonaHoraria));
  const dias = useMemo(() => diasAbiertos(negocio, hoy), [negocio, hoy]);

  const reservables = serviciosReservables(negocio);
  // Con un solo servicio reservable no hace falta elegirlo.
  const servicio = reservables.find((s) => s.id === sel.servicio) ?? (reservables.length === 1 ? reservables[0] : null);
  const profesionales = servicio ? profesionalesPara(negocio, servicio.id) : [];
  const fecha = sel.fecha ?? dias[0];

  // Turnos del día elegido. Se guardan junto a la clave que los pidió, así
  // "cargando" es simplemente que la clave no coincide.
  const clave = servicio ? `${servicio.id}|${sel.profesional}|${fecha}` : null;
  const [turnos, setTurnos] = useState<{ clave: string; lista: Turno[] } | null>(null);
  const [recarga, setRecarga] = useState(0);

  useEffect(() => {
    if (!clave || !servicio) return;
    const q = new URLSearchParams({ servicio: servicio.id, fecha, ...paramNegocio(negocio) });
    if (sel.profesional) q.set("profesional", sel.profesional);
    let vigente = true;
    fetch(`/api/turnos?${q}`)
      .then((r) => (r.ok ? r.json() : { turnos: [] }))
      .then((d) => vigente && setTurnos({ clave, lista: d.turnos }))
      .catch(() => vigente && setTurnos({ clave, lista: [] }));
    return () => {
      vigente = false;
    };
  }, [clave, servicio, fecha, sel.profesional, recarga, negocio]);

  const cargando = clave !== null && turnos?.clave !== clave;
  const lista = !cargando && turnos ? turnos.lista : [];

  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmada, setConfirmada] = useState<Confirmada | null>(null);

  async function enviar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!servicio || !sel.hora) return;
    const datos = new FormData(e.currentTarget);
    setEnviando(true);
    setError(null);
    try {
      const r = await fetch("/api/reservas", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ...paramNegocio(negocio),
          servicio: servicio.id,
          profesional: sel.profesional,
          fecha,
          hora: sel.hora,
          nombre: datos.get("nombre"),
          telefono: datos.get("telefono"),
          email: datos.get("email"),
          nota: datos.get("nota"),
          sitio: datos.get("sitio"),
        }),
      });
      const d = await r.json();
      if (!r.ok) {
        setError(d.error ?? "No se pudo reservar. Probá de nuevo.");
        if (r.status === 409) {
          setSel({ ...sel, hora: null });
          setRecarga((n) => n + 1);
        }
        return;
      }
      setConfirmada({
        nombre: String(datos.get("nombre")).trim().split(" ")[0],
        email: String(datos.get("email")).trim(),
        servicio,
        profesional: nombreProfesional(negocio, d.reserva.profesional),
        fecha,
        hora: sel.hora,
      });
    } catch {
      setError("No hay conexión. Revisá internet y probá de nuevo.");
    } finally {
      setEnviando(false);
    }
  }

  if (confirmada) {
    return (
      <div className="bg-superficie border-t-4 border-acento p-6 sm:p-10" role="status">
        <p className="titular [--t:3rem] sm:[--t:3.75rem]">Listo, {confirmada.nombre}.</p>
        <p className="mt-4 text-lg max-w-prose">
          Te esperamos el <strong>{fechaLarga(confirmada.fecha)}</strong> a las <strong>{confirmada.hora}</strong> para{" "}
          {confirmada.servicio.nombre.toLowerCase()}
          {negocio.profesionales.length > 1 && <> con {confirmada.profesional}</>}.
          {negocio.direccion && <> Estamos en {negocio.direccion}.</>}
        </p>
        <p className="mt-3 max-w-prose">
          El local ya tiene tu reserva. Te mandamos la confirmación a <strong>{confirmada.email}</strong>.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <a
            href={linkCalendario(negocio, confirmada.servicio, confirmada.fecha, confirmada.hora)}
            target="_blank"
            rel="noreferrer"
            className="rounded-(--radio-boton) bg-acento text-sobre-acento px-5 py-3 font-semibold"
          >
            Agregar a mi calendario
          </a>
        </div>
        <p className="mt-6 text-sm text-suave">
          ¿Necesitás cambiar el horario?{" "}
          {negocio.whatsapp ? (
            <a href={linkWhatsapp(negocio.whatsapp)} target="_blank" rel="noreferrer" className="underline underline-offset-4">
              Escribinos por WhatsApp
            </a>
          ) : (
            "Respondé el email de confirmación"
          )}
          {negocio.telefono && <> o llamá al {negocio.telefono}</>}.
        </p>
        <button
          type="button"
          className="mt-4 text-sm underline underline-offset-4"
          onClick={() => {
            setConfirmada(null);
            setSel({ servicio: null, profesional: "", fecha: null, hora: null });
          }}
        >
          Hacer otra reserva
        </button>
      </div>
    );
  }

  const conProfesional = profesionales.length > 1;
  let n = 1;

  return (
    <ol className="border-b border-linea">
      <Paso n={n++} titulo="Qué te hacés" activo>
        <div className="grid gap-2 sm:grid-cols-2">
          {reservables.map((s) => (
            <button
              key={s.id}
              type="button"
              aria-pressed={s.id === servicio?.id}
              onClick={() => setSel({ ...sel, servicio: s.id, profesional: "", hora: null })}
              className={opcion(s.id === servicio?.id)}
            >
              <span className="block font-semibold">{s.nombre}</span>
              <span className="block text-sm opacity-75">
                {duracion(s.duracion)} · {precio(negocio.moneda, s.precio)}
              </span>
            </button>
          ))}
        </div>
      </Paso>

      {conProfesional && (
        <Paso n={n++} titulo="Con quién" activo={!!servicio}>
          <div className="flex flex-wrap gap-2">
            {[{ id: "", nombre: "Me da igual" }, ...profesionales].map((p) => (
              <button
                key={p.id}
                type="button"
                disabled={!servicio}
                aria-pressed={sel.profesional === p.id}
                onClick={() => setSel({ ...sel, profesional: p.id, hora: null })}
                className={opcion(sel.profesional === p.id)}
              >
                {p.nombre}
              </button>
            ))}
          </div>
        </Paso>
      )}

      <Paso n={n++} titulo="Qué día y a qué hora" activo={!!servicio}>
        {!servicio ? (
          <p className="text-suave">Elegí primero un servicio.</p>
        ) : (
          <>
            <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-2 snap-x" role="group" aria-label="Día">
              {dias.map((d) => (
                <button
                  key={d}
                  type="button"
                  aria-pressed={d === fecha}
                  onClick={() => setSel({ ...sel, fecha: d, hora: null })}
                  className={`${opcion(d === fecha)} snap-start shrink-0 text-center min-w-[4.5rem]`}
                >
                  <span className="block text-sm first-letter:uppercase">{fechaCorta(d, hoy)}</span>
                </button>
              ))}
            </div>

            <div className="mt-4 min-h-24" aria-live="polite">
              {cargando ? (
                <p className="text-suave">Buscando horarios libres…</p>
              ) : lista.length === 0 ? (
                <p className="text-suave">
                  No quedan turnos el {fechaLarga(fecha)}.{" "}
                  {dias.indexOf(fecha) < dias.length - 1 && (
                    <button
                      type="button"
                      className="underline underline-offset-4 text-texto"
                      onClick={() => setSel({ ...sel, fecha: dias[dias.indexOf(fecha) + 1], hora: null })}
                    >
                      Ver el día siguiente
                    </button>
                  )}
                </p>
              ) : (
                <div className="grid grid-cols-4 gap-2 sm:grid-cols-6" role="group" aria-label="Hora">
                  {lista.map((t) => (
                    <button
                      key={t.hora}
                      type="button"
                      aria-pressed={t.hora === sel.hora}
                      onClick={() => setSel({ ...sel, fecha, hora: t.hora })}
                      className={`${opcion(t.hora === sel.hora)} text-center tabular-nums font-semibold`}
                    >
                      {t.hora}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </Paso>

      <Paso n={n++} titulo="Tus datos" activo={!!sel.hora}>
        <form onSubmit={enviar} className="grid gap-4 max-w-md">
          <label className="grid gap-1">
            <span className="text-sm font-semibold">Nombre</span>
            <input name="nombre" required minLength={2} maxLength={80} autoComplete="name" disabled={!sel.hora} className="rounded-(--radio-caja) border border-linea bg-superficie px-3 py-2.5" />
          </label>
          <label className="grid gap-1">
            <span className="text-sm font-semibold">Celular</span>
            <input
              name="telefono"
              type="tel"
              required
              inputMode="tel"
              autoComplete="tel"
              placeholder="099 123 456"
              disabled={!sel.hora}
              className="rounded-(--radio-caja) border border-linea bg-superficie px-3 py-2.5"
            />
            <span className="text-xs text-suave">Solo lo usamos si hay que avisarte de un cambio.</span>
          </label>
          <label className="grid gap-1">
            <span className="text-sm font-semibold">Email</span>
            <input
              name="email"
              type="email"
              required
              maxLength={120}
              autoComplete="email"
              placeholder="nombre@gmail.com"
              disabled={!sel.hora}
              className="rounded-(--radio-caja) border border-linea bg-superficie px-3 py-2.5"
            />
            <span className="text-xs text-suave">Te mandamos la confirmación acá, y un aviso si el local tiene que cancelar.</span>
          </label>
          <label className="grid gap-1">
            <span className="text-sm font-semibold">
              Algo que debamos saber <span className="font-normal text-suave">(opcional)</span>
            </span>
            <textarea name="nota" rows={2} maxLength={300} disabled={!sel.hora} className="rounded-(--radio-caja) border border-linea bg-superficie px-3 py-2.5" />
          </label>
          <input name="sitio" tabIndex={-1} autoComplete="off" aria-hidden className="absolute -left-[9999px]" />

          {sel.hora && servicio && (
            <p className="text-sm">
              {servicio.nombre}, {fechaLarga(fecha)} a las {sel.hora}
              {sel.profesional && <> con {nombreProfesional(negocio, sel.profesional)}</>}.
            </p>
          )}
          {error && (
            <p role="alert" className="border-l-4 border-acento bg-superficie px-3 py-2 text-sm">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={!sel.hora || enviando}
            className="rounded-(--radio-boton) bg-acento text-sobre-acento px-6 py-3.5 font-semibold text-lg disabled:opacity-50 justify-self-start"
          >
            {enviando ? "Reservando…" : "Reservar turno"}
          </button>
        </form>
      </Paso>
    </ol>
  );
}
