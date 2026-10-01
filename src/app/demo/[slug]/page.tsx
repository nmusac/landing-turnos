import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Landing } from "@/components/Landing";
import { SelectorEstilo } from "@/components/SelectorEstilo";
import { metadataDemo } from "@/lib/metadata";
import { estiloDemo, resolverNegocio } from "@/lib/negocio";

// Demo de la landing para un prospecto, armada desde su fila en la planilla (demos/README.md).
// ?estilo=verde|noche|salon o la barrita "Vista previa" la muestran en otro estilo.

async function negocioDe({ params, searchParams }: PageProps<"/demo/[slug]">) {
  return resolverNegocio((await params).slug, await estiloDemo((await searchParams).estilo));
}

export async function generateMetadata(props: PageProps<"/demo/[slug]">): Promise<Metadata> {
  const n = await negocioDe(props);
  if (!n) return {};
  return metadataDemo(n, `${n.nombre} · Reservá tu turno`);
}

export default async function Demo(props: PageProps<"/demo/[slug]">) {
  const n = await negocioDe(props);
  if (!n) notFound();
  return (
    <>
      <Landing negocio={n} />
      <SelectorEstilo actual={n.estilo} slug={n.slug} />
    </>
  );
}
