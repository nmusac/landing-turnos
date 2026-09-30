"use client";

import { useActionState } from "react";
import { ingresar } from "@/app/panel/acciones";

export function FormularioPin({ negocio }: { negocio: string }) {
  const [error, accion, pendiente] = useActionState(ingresar, null);
  return (
    <form action={accion} className="mt-8 grid gap-3">
      <input type="hidden" name="negocio" value={negocio} />
      <label className="grid gap-1">
        <span className="text-sm font-semibold">PIN</span>
        <input
          name="pin"
          type="password"
          inputMode="numeric"
          autoComplete="current-password"
          required
          autoFocus
          className="rounded-(--radio-caja) bg-superficie text-texto px-3 py-3 text-2xl tracking-[0.4em]"
        />
      </label>
      {error && (
        <p role="alert" className="text-sm">
          {error}
        </p>
      )}
      <button disabled={pendiente} className="rounded-(--radio-boton) bg-acento text-sobre-acento py-3 font-semibold disabled:opacity-60">
        {pendiente ? "Entrando…" : "Entrar"}
      </button>
    </form>
  );
}
