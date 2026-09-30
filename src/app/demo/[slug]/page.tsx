import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Landing } from "@/components/Landing";
import { SelectorEstilo } from "@/components/SelectorEstilo";
import { esEstilo } from "@/lib/estilos";
import { resolverNegocio } from "@/lib/negocio";

// Demo de la landing para un prospecto, armada desde su fila en la planilla (demos/README.md).
// ?estilo=verde|noche|salon muestra la misma demo en otro estilo.

async function negocioDe({ params, searchParams }: PageProps<"/demo/[slug]">) {
  const estilo = (await searchParams).estilo;
  return resolverNegocio((await params).slug, esEstilo(estilo) ? estilo : undefined);
}

export async function generateMetadata(props: PageProps<"/demo/[slug]">): Promise<Metadata> {
  const n = await negocioDe(props);
  if (!n) return {};
  return {
    title: `${n.nombre} · Reservá tu turno`,
    description: n.frase,
    robots: { index: false, follow: false },
    openGraph: { title: n.nombre, description: n.frase, images: [n.fotos.portada.src] },
  };
}

export default async function Demo(props: PageProps<"/demo/[slug]">) {
  const n = await negocioDe(props);
  if (!n) notFound();
  return (
    <>
      <Landing negocio={n} />
      <SelectorEstilo actual={n.estilo} />
    </>
  );
}
