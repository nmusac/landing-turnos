import type { Metadata } from "next";
import { Archivo } from "next/font/google";
import { negocio } from "@/negocio.config";
import { variablesTema } from "@/lib/formato";
import "./globals.css";

const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
  axes: ["wdth"],
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
  // Colores base; la landing y el panel los vuelven a fijar con los de su negocio (demos).
  return (
    <html lang="es" style={variablesTema(negocio.tema)} className={`${archivo.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col font-sans">{children}</body>
    </html>
  );
}
