import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Landing } from "@/components/Landing";
import { resolverNegocio } from "@/lib/negocio";

// Demo de la landing para un prospecto, armada desde su fila en la planilla (demos/README.md).

export async function generateMetadata({ params }: PageProps<"/demo/[slug]">): Promise<Metadata> {
  const n = await resolverNegocio((await params).slug);
  if (!n) return {};
  return {
    title: `${n.nombre} · Reservá tu turno`,
    description: n.frase,
    robots: { index: false, follow: false },
    openGraph: { title: n.nombre, description: n.frase, images: [n.fotos.portada.src] },
  };
}

export default async function Demo({ params }: PageProps<"/demo/[slug]">) {
  const n = await resolverNegocio((await params).slug);
  if (!n) notFound();
  return <Landing negocio={n} />;
}
