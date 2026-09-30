import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Ingresar } from "@/components/panel/Ingresar";
import { resolverNegocio } from "@/lib/negocio";

export const metadata: Metadata = { title: "Panel (demo)", robots: { index: false, follow: false } };

export default async function IngresarDemo({ params }: PageProps<"/demo/[slug]/panel/ingresar">) {
  const n = await resolverNegocio((await params).slug);
  if (!n) notFound();
  return <Ingresar negocio={n} />;
}
