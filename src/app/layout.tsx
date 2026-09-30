import type { Metadata } from "next";
import { Archivo, Cormorant_Garamond, Playfair_Display } from "next/font/google";
import { negocio } from "@/negocio.config";
import { variablesTema } from "@/lib/formato";
import "./globals.css";

const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
  axes: ["wdth"],
});

// Títulos de los estilos "noche" y "salon". Sin preload: el navegador solo las
// descarga si la página usa ese estilo.
const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  preload: false,
});

const cormorant = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin"],
  weight: ["500", "600"],
  style: ["italic"],
  preload: false,
});

export const metadata: Metadata = {
  title: `${negocio.nombre} · Reservá tu turno`,
  description: `${negocio.frase} ${negocio.direccion}, ${negocio.ciudad}. Reservá online.`,
  openGraph: {
    title: negocio.nombre,
    description: negocio.frase,
    images: [negocio.fotos.portada.src],
    locale: "es_UY",
    type: "website",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  // Estilo base; la landing y el panel lo vuelven a fijar con el de su negocio (demos).
  return (
    <html
      lang="es"
      data-estilo={negocio.estilo}
      style={variablesTema(negocio)}
      className={`${archivo.variable} ${playfair.variable} ${cormorant.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans">{children}</body>
    </html>
  );
}
