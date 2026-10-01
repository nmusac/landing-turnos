import type { Metadata } from "next";
import type { Negocio } from "@/negocio.config";

/** Foto para la vista previa del link (WhatsApp, redes): las de Google Maps se piden en 1200×630. */
function fotoVistaPrevia(n: Negocio) {
  return n.fotos.portada.src.replace(/=w\d+-h\d+/, "=w1200-h630");
}

/**
 * Metadata de las páginas de una demo: título, descripción y vista previa con el
 * nombre y la foto del prospecto (no los de la plantilla). Las demos no se indexan.
 */
export function metadataDemo(n: Negocio, titulo: string, descripcion = n.frase): Metadata {
  const imagen = fotoVistaPrevia(n);
  return {
    title: titulo,
    description: descripcion,
    robots: { index: false, follow: false },
    openGraph: { title: titulo, description: descripcion, images: [imagen], locale: "es_UY", type: "website" },
    twitter: { card: "summary_large_image", title: titulo, description: descripcion, images: [imagen] },
  };
}
