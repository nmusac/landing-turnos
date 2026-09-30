"use client";

import { useReserva } from "./Contexto";

export function BotonServicio({ servicio, nombre }: { servicio: string; nombre: string }) {
  const { elegir } = useReserva();
  return (
    <button
      type="button"
      onClick={() => elegir({ servicio })}
      className="shrink-0 text-sm font-semibold underline underline-offset-4 hover:text-suave"
      aria-label={`Reservar ${nombre}`}
    >
      Reservar
    </button>
  );
}
