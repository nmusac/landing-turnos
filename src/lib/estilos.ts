import type { Negocio, Tema } from "@/negocio.config";

// Los tres estilos visuales de la landing. Mismo contenido y fotos; cambian
// colores, tipografía de títulos (ver globals.css, [data-estilo]) y esquinas.

export const ESTILOS = {
  // Verde botella con acento latón y títulos en Archivo angosta.
  verde: {
    nombre: "Verde",
    radioBoton: "0",
    radioCaja: "0",
    tema: {
      hero: "#1E3B34",
      sobreHero: "#F2F6F3",
      fondo: "#E4EDE7",
      superficie: "#FFFFFF",
      texto: "#17241F",
      suave: "#56655F",
      linea: "#C4D3CA",
      acento: "#C8962B",
      sobreAcento: "#1A1406",
    },
  },
  // Barbería clásica: casi negro, crema y cobre, títulos en Playfair Display.
  noche: {
    nombre: "Noche",
    radioBoton: "0",
    radioCaja: "0",
    tema: {
      hero: "#141414",
      sobreHero: "#EDE5D6",
      fondo: "#1B1B1B",
      superficie: "#242220",
      texto: "#EDE5D6",
      suave: "#A69C8C",
      linea: "#3A3631",
      acento: "#D2743A",
      sobreAcento: "#1B1B1B",
    },
  },
  // Peluquería femenina: rosa empolvado y bordó, títulos en Cormorant cursiva.
  salon: {
    nombre: "Salón",
    radioBoton: "999px",
    radioCaja: "12px",
    tema: {
      hero: "#EAD3CF",
      sobreHero: "#3E2229",
      fondo: "#F6ECEA",
      superficie: "#FFFFFF",
      texto: "#3E2229",
      suave: "#7A5A60",
      linea: "#E3C9C4",
      acento: "#8E2F4B",
      sobreAcento: "#FFF4F6",
    },
  },
} satisfies Record<string, { nombre: string; radioBoton: string; radioCaja: string; tema: Tema }>;

export type Estilo = keyof typeof ESTILOS;

/** Cookie con el estilo elegido en la barrita de una demo; su `path` la limita a esa demo. */
export const COOKIE_ESTILO = "estilo-demo";

export const esEstilo =(v: unknown): v is Estilo => typeof v === "string" && v in ESTILOS;

/** Colores finales: los del estilo más los retoques propios del negocio. */
export const temaDe = (n: Negocio): Tema => ({ ...ESTILOS[n.estilo].tema, ...n.tema });
