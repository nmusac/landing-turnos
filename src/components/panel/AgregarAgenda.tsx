"use client";

import { startTransition, useActionState, useEffect, useRef, useState, type ReactNode } from "react";
import type { Negocio } from "@/negocio.config";
import { agregarTurno, bloquear, type Estado } from "@/app/panel/acciones";

const campo = "border border-linea bg-superficie px-3 py-2";

/**
 * Envía sin el reseteo automático de React: si hay un error, lo escrito queda;
 * si salió bien, se limpia el formulario.
 */
function Formulario({
  accion,
  children,
}: {
  accion: (e: Estado, d: FormData) => Promise<Estado>;
  children: (estado: Estado, pendiente: boolean) => ReactNode;
}) {
  const [estado, ejecutar, pendiente] = useActionState(accion, null);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (estado?.tipo === "ok") ref.current?.reset();
  }, [estado]);
  return (
    <form
      ref={ref}
      onSubmit={(e) => {
        e.preventDefault();
        const datos = new FormData(e.currentTarget);
        startTransition(() => ejecutar(datos));
      }}
      className="mt-4 grid gap-3 sm:grid-cols-2"
    >
      {children(estado, pendiente)}
    </form>
  );
}

function Resultado({ estado }: { estado: Estado }) {
  if (!estado) return null;
  return (
    <p role={estado.tipo === "error" ? "alert" : "status"} className="border-l-4 border-acento bg-fondo px-3 py-2 text-sm sm:col-span-2">
      {estado.mensaje}
    </p>
  );
}

export function AgregarAgenda({ negocio: n, dia, hoy }: { negocio: Negocio; dia: string; hoy: string }) {
  const [modo, setModo] = useState<"turno" | "bloqueo">("turno");
  const slug = n.esDemo ? n.slug : "";
  const muestraProfesional = n.profesionales.length > 1;

  const selectorProfesional = (vacio: string) =>
    muestraProfesional && (
      <label className="grid gap-1 text-sm">
        <span className="font-semibold">Quién</span>
        <select name="profesional" className={campo}>
          <option value="">{vacio}</option>
          {n.profesionales.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nombre}
            </option>
          ))}
        </select>
      </label>
    );

  return (
    <section className="mt-10 bg-superficie p-4 sm:p-5" aria-labelledby="agregar">
      <h3 id="agregar" className="subtitulo text-2xl">
        Agregar a la agenda
      </h3>
      <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Qué agregar">
        {(
          [
            ["turno", "Turno de un cliente"],
            ["bloqueo", "Bloquear horario"],
          ] as const
        ).map(([valor, texto]) => (
          <button
            key={valor}
            type="button"
            aria-pressed={modo === valor}
            onClick={() => setModo(valor)}
            className={`border px-3 py-2 text-sm ${modo === valor ? "border-texto bg-texto text-superficie" : "border-linea hover:border-texto"}`}
          >
            {texto}
          </button>
        ))}
      </div>

      {modo === "turno" ? (
        <Formulario accion={agregarTurno}>
          {(estado, pendiente) => (
            <>
              <p className="text-sm text-suave sm:col-span-2">
                Para clientes que reservan por teléfono o en persona. Así el horario queda ocupado en la web.
              </p>
              <input type="hidden" name="negocio" value={slug} />
              <label className="grid gap-1 text-sm sm:col-span-2">
                <span className="font-semibold">Nombre del cliente</span>
                <input name="nombre" required minLength={2} maxLength={80} className={campo} />
              </label>
              <label className="grid gap-1 text-sm">
                <span className="font-semibold">Servicio</span>
                <select name="servicio" required className={campo}>
                  {n.servicios.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.nombre} ({s.duracion} min)
                    </option>
                  ))}
                </select>
              </label>
              {selectorProfesional("Cualquiera libre")}
              <label className="grid gap-1 text-sm">
                <span className="font-semibold">Día</span>
                <input type="date" name="fecha" defaultValue={dia} min={hoy} required className={campo} />
              </label>
              <label className="grid gap-1 text-sm">
                <span className="font-semibold">Hora</span>
                <input type="time" name="hora" step={n.turnos.intervalo * 60} required className={campo} />
              </label>
              <label className="grid gap-1 text-sm">
                <span className="font-semibold">
                  Celular <span className="font-normal text-suave">(opcional)</span>
                </span>
                <input name="telefono" type="tel" inputMode="tel" maxLength={30} className={campo} />
              </label>
              <label className="grid gap-1 text-sm">
                <span className="font-semibold">
                  Email <span className="font-normal text-suave">(opcional, le llega la confirmación)</span>
                </span>
                <input name="email" type="email" maxLength={120} className={campo} />
              </label>
              <Resultado estado={estado} />
              <button disabled={pendiente} className="bg-texto text-superficie px-4 py-2.5 font-semibold justify-self-start disabled:opacity-60">
                {pendiente ? "Agendando…" : "Agendar turno"}
              </button>
            </>
          )}
        </Formulario>
      ) : (
        <Formulario accion={bloquear}>
          {(estado, pendiente) => (
            <>
              <p className="text-sm text-suave sm:col-span-2">
                Para feriados, vacaciones o un rato libre. Mientras esté bloqueado nadie puede reservar en ese horario.
              </p>
              <input type="hidden" name="negocio" value={slug} />
              <label className="grid gap-1 text-sm">
                <span className="font-semibold">Día</span>
                <input type="date" name="fecha" defaultValue={dia} min={hoy} required className={campo} />
              </label>
              {selectorProfesional("Todo el local")}
              <label className="flex items-center gap-2 text-sm sm:col-span-2">
                <input type="checkbox" name="dia-completo" defaultChecked className="size-4" />
                Todo el día
              </label>
              <label className="grid gap-1 text-sm">
                <span className="font-semibold">Desde</span>
                <input type="time" name="desde" defaultValue="10:00" step={n.turnos.intervalo * 60} className={campo} />
              </label>
              <label className="grid gap-1 text-sm">
                <span className="font-semibold">Hasta</span>
                <input type="time" name="hasta" defaultValue="13:00" step={n.turnos.intervalo * 60} className={campo} />
              </label>
              <label className="grid gap-1 text-sm sm:col-span-2">
                <span className="font-semibold">
                  Motivo <span className="font-normal text-suave">(opcional, solo lo ves vos)</span>
                </span>
                <input name="motivo" maxLength={100} className={campo} />
              </label>
              <Resultado estado={estado} />
              <button disabled={pendiente} className="bg-texto text-superficie px-4 py-2.5 font-semibold justify-self-start disabled:opacity-60">
                {pendiente ? "Bloqueando…" : "Bloquear horario"}
              </button>
              <p className="text-xs text-suave sm:col-span-2">Los turnos ya reservados en ese horario no se cancelan solos.</p>
            </>
          )}
        </Formulario>
      )}
    </section>
  );
}
