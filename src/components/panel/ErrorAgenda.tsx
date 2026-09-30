"use client";

import { useEffect } from "react";

/** Pantalla para cuando la agenda no carga (ej. la planilla de Google no respondió). */
export function ErrorAgenda({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="flex flex-1 items-center justify-center bg-fondo px-4 py-16 text-texto">
      <div className="max-w-sm">
        <h1 className="titular [--t:3rem]">No se pudo cargar la agenda</h1>
        <p className="mt-4 text-suave">
          Puede ser un problema momentáneo con la planilla de turnos. Probá de nuevo en un momento.
        </p>
        <button onClick={() => retry()} className="mt-6 rounded-(--radio-boton) bg-acento text-sobre-acento px-5 py-3 font-semibold">
          Reintentar
        </button>
        {error.digest && <p className="mt-6 text-xs text-suave">Código para soporte: {error.digest}</p>}
      </div>
    </main>
  );
}
