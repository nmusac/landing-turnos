import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Ingresar } from "@/components/panel/Ingresar";
import { SelectorEstilo } from "@/components/SelectorEstilo";
import { metadataDemo } from "@/lib/metadata";
import { estiloDemo, resolverNegocio } from "@/lib/negocio";

export async function generateMetadata({ params }: PageProps<"/demo/[slug]/panel/ingresar">): Promise<Metadata> {
  const n = await resolverNegocio((await params).slug);
  if (!n) return {};
  return metadataDemo(n, `${n.nombre} · Agenda del local`, `Así ve ${n.nombre} sus turnos reservados online.`);
}

export default async function IngresarDemo({ params, searchParams }: PageProps<"/demo/[slug]/panel/ingresar">) {
  const n = await resolverNegocio((await params).slug, await estiloDemo((await searchParams).estilo));
  if (!n) notFound();
  return (
    <>
      <Ingresar negocio={n} />
      <SelectorEstilo actual={n.estilo} slug={n.slug} />
    </>
  );
}
