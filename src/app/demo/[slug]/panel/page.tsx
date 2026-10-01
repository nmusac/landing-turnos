import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Agenda } from "@/components/panel/Agenda";
import { SelectorEstilo } from "@/components/SelectorEstilo";
import { metadataDemo } from "@/lib/metadata";
import { estiloDemo, resolverNegocio } from "@/lib/negocio";
import { exigirSesion } from "@/lib/sesion";

export async function generateMetadata({ params }: PageProps<"/demo/[slug]/panel">): Promise<Metadata> {
  const n = await resolverNegocio((await params).slug);
  if (!n) return {};
  return metadataDemo(n, `${n.nombre} · Agenda del local`, `Así ve ${n.nombre} sus turnos reservados online.`);
}

export default async function PanelDemo({ params, searchParams }: PageProps<"/demo/[slug]/panel">) {
  const { slug } = await params;
  const { dia, estilo } = await searchParams;
  const n = await resolverNegocio(slug, await estiloDemo(estilo));
  if (!n) notFound();
  await exigirSesion(`/demo/${slug}/panel/ingresar`);
  return (
    <>
      <Agenda negocio={n} diaPedido={dia} />
      <SelectorEstilo actual={n.estilo} slug={n.slug} />
    </>
  );
}
