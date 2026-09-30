"use client";

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import type { Negocio } from "@/negocio.config";

export type Seleccion = {
  servicio: string | null;
  profesional: string; // "" = cualquiera
  fecha: string | null;
  hora: string | null;
};

const vacia: Seleccion = { servicio: null, profesional: "", fecha: null, hora: null };

type Ctx = {
  negocio: Negocio;
  sel: Seleccion;
  setSel: (s: Seleccion) => void;
  /** Precarga una elección (desde el encabezado o la lista de precios) y lleva al formulario. */
  elegir: (s: Partial<Seleccion>) => void;
};

const Contexto = createContext<Ctx | null>(null);

export function ReservaProvider({ negocio, children }: { negocio: Negocio; children: ReactNode }) {
  const [sel, setSel] = useState<Seleccion>(vacia);
  const elegir = useCallback((s: Partial<Seleccion>) => {
    setSel({ ...vacia, ...s });
    document.getElementById("reservar")?.scrollIntoView({ block: "start" });
  }, []);
  return <Contexto.Provider value={{ negocio, sel, setSel, elegir }}>{children}</Contexto.Provider>;
}

export function useReserva() {
  const c = useContext(Contexto);
  if (!c) throw new Error("useReserva fuera de ReservaProvider");
  return c;
}

/** En una demo, la API necesita saber de qué prospecto se trata. */
export const paramNegocio = (n: Negocio): Record<string, string> => (n.esDemo ? { negocio: n.slug } : {});
