import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Ingresar } from "@/components/panel/Ingresar";
import { SelectorEstilo } from "@/components/SelectorEstilo";
import { estiloDemo, resolverNegocio } from "@/lib/negocio";

export const metadata: Metadata = { title: "Panel (demo)", robots: { index: false, follow: false } };

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
