import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Agenda } from "@/components/panel/Agenda";
import { resolverNegocio } from "@/lib/negocio";
import { exigirSesion } from "@/lib/sesion";

export const metadata: Metadata = { title: "Agenda (demo)", robots: { index: false, follow: false } };

export default async function PanelDemo({ params, searchParams }: PageProps<"/demo/[slug]/panel">) {
  const { slug } = await params;
  const n = await resolverNegocio(slug);
  if (!n) notFound();
  await exigirSesion(`/demo/${slug}/panel/ingresar`);
  return <Agenda negocio={n} diaPedido={(await searchParams).dia} />;
}
