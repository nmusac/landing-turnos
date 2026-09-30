import type { Metadata } from "next";
import { negocio } from "@/negocio.config";
import { Agenda } from "@/components/panel/Agenda";
import { exigirSesion } from "@/lib/sesion";

export const metadata: Metadata = { title: `Agenda · ${negocio.nombre}`, robots: { index: false } };

export default async function Panel({ searchParams }: PageProps<"/panel">) {
  await exigirSesion("/panel/ingresar");
  return <Agenda negocio={negocio} diaPedido={(await searchParams).dia} />;
}
