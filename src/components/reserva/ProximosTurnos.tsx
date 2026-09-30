"use client";

import { useEffect, useState } from "react";
import type { Servicio } from "@/negocio.config";
import { serviciosReservables } from "@/lib/disponibilidad";
import { fechaCorta, fechaLocal } from "@/lib/tiempo";
import { paramNegocio, useReserva } from "./Contexto";

type Proximo = { fecha: string; hora: string };

/** Los próximos turnos libres del primer servicio reservable, listos para tocar. */
export function ProximosTurnos() {
  const { negocio } = useReserva();
  const servicio = serviciosReservables(negocio)[0];
  return servicio ? <Lista servicio={servicio} /> : null;
}

function Lista({ servicio }: { servicio: Servicio }) {
  const { negocio, elegir } = useReserva();
  const [proximos, setProximos] = useState<Proximo[] | null>(null);

  useEffect(() => {
    const q = new URLSearchParams({ servicio: servicio.id, proximos: "6", ...paramNegocio(negocio) });
    fetch(`/api/turnos?${q}`)
      .then((r) => (r.ok ? r.json() : { proximos: [] }))
      .then((d) => setProximos(d.proximos))
      .catch(() => setProximos([]));
  }, [servicio.id, negocio]);

  const hoy = fechaLocal(new Date(), negocio.zonaHoraria);

  return (
    <div className="rounded-(--radio-caja) bg-superficie text-texto p-5 sm:p-6 shadow-[0_24px_60px_-20px_rgba(0,0,0,0.45)]">
      <h2 className="subtitulo text-2xl">Próximos turnos libres</h2>
      <p className="mt-1 text-sm text-suave">
        {servicio.nombre}, {servicio.duracion} min. Tocá uno para reservarlo.
      </p>

      <ul className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 min-h-[6.5rem]" aria-live="polite">
        {proximos === null &&
          Array.from({ length: 6 }, (_, i) => (
            <li key={i} className="h-12 animate-pulse bg-fondo rounded-(--radio-boton)" aria-hidden />
          ))}
        {proximos?.map((p) => (
          <li key={p.fecha + p.hora}>
            <button
              type="button"
              onClick={() => elegir({ servicio: servicio.id, fecha: p.fecha, hora: p.hora })}
              className="rounded-(--radio-boton) flex h-12 w-full flex-col items-center justify-center border border-linea leading-tight hover:border-texto hover:bg-fondo"
            >
              <span className="text-xs text-suave">{fechaCorta(p.fecha, hoy)}</span>
              <span className="font-semibold tabular-nums">{p.hora}</span>
            </button>
          </li>
        ))}
        {proximos?.length === 0 && (
          <li className="col-span-full text-sm text-suave">
            No hay turnos libres en los próximos días. Escribinos y te buscamos un lugar.
          </li>
        )}
      </ul>

      <a href="#reservar" className="mt-4 inline-block text-sm font-semibold underline underline-offset-4">
        Ver todos los días y servicios
      </a>
    </div>
  );
}
