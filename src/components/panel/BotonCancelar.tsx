"use client";

import { cancelarReserva } from "@/app/panel/acciones";

export function BotonCancelar({
  id,
  negocio,
  descripcion,
  avisa,
}: {
  id: string;
  negocio: string;
  descripcion: string;
  avisa: boolean;
}) {
  const aviso = avisa ? " Le vamos a avisar por email." : "";
  return (
    <form
      action={cancelarReserva}
      onSubmit={(e) => {
        if (!confirm(`¿Cancelar el turno de ${descripcion}? El horario vuelve a quedar libre.${aviso}`)) e.preventDefault();
      }}
    >
      <input type="hidden" name="negocio" value={negocio} />
      <input type="hidden" name="id" value={id} />
      <button className="text-sm underline underline-offset-4 text-suave hover:text-texto">Cancelar turno</button>
    </form>
  );
}
