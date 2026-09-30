import type { Metadata } from "next";
import { negocio } from "@/negocio.config";
import { Ingresar } from "@/components/panel/Ingresar";

export const metadata: Metadata = { title: `Panel · ${negocio.nombre}`, robots: { index: false } };

export default function IngresarPanel() {
  return <Ingresar negocio={negocio} />;
}
