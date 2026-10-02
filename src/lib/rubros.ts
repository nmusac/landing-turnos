// Lo que cambia en una demo según el rubro del prospecto: los servicios que se
// ofrecen y las fotos genéricas que se usan cuando el local no tiene propias.
import type { Foto, Servicio } from "@/negocio.config";

export type Rubro = "unas" | "depilacion" | "pestanas" | "masajes" | "estetica" | "barberia" | "peluqueria";

const sinTildes = (s: string) => s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();

// El orden importa: "Salón de manicura" es uñas aunque diga salón; "Estética capilar" con rubro
// Barbería es barbería.
const DETECCION: [Rubro, RegExp][] = [
  ["unas", /unas|nails?\b|manicur|pedicur/],
  ["depilacion", /depila|\bcera\b|waxing/],
  ["pestanas", /pestan|lashes|cejas|brows/],
  ["masajes", /masaj|massage|\bspa\b/],
  ["barberia", /barber/],
  ["peluqueria", /peluquer|estilista|hair|salon de belleza|peinad/],
  ["estetica", /estetic|cosmet|facial|beauty|skin/],
];

/** Se decide por la categoría de Google Maps; si no dice nada, por el nombre del local. */
export function rubroDe(rubro: string, nombre: string): Rubro {
  for (const texto of [rubro, nombre].map(sinTildes)) {
    for (const [r, re] of DETECCION) if (re.test(texto)) return r;
  }
  return "peluqueria";
}

type Textos = Pick<Servicio, "nombre" | "descripcion" | "duracion" | "precio">;

// Mismos 5 servicios y mismos id que la plantilla (las reservas guardan el id): los dos primeros
// se reservan online, los otros tres quedan en "Consultar". Duraciones en múltiplos de 15 min.
const SERVICIOS: Partial<Record<Rubro, [Textos, Textos, Textos, Textos, Textos]>> = {
  unas: [
    { nombre: "Esmaltado semipermanente", descripcion: "Limado, cutículas y color que dura semanas.", duracion: 45, precio: 900 },
    { nombre: "Manicura clásica", descripcion: "Limado, cutículas y esmaltado común.", duracion: 30, precio: 600 },
    { nombre: "Uñas esculpidas", descripcion: "Acrílico o gel, con el largo y la forma que quieras.", duracion: 90, precio: null },
    { nombre: "Pedicura", descripcion: "Pies prolijos, con esmaltado incluido.", duracion: 60, precio: null },
    { nombre: "Nail art", descripcion: "Diseños a mano; te pasamos precio según el diseño.", duracion: 30, precio: null },
  ],
  depilacion: [
    { nombre: "Depilación piernas enteras", descripcion: "Muslos y pantorrillas.", duracion: 30, precio: 700 },
    { nombre: "Cavado", descripcion: "Cavado común o completo.", duracion: 15, precio: 400 },
    { nombre: "Depilación definitiva", descripcion: "Te pasamos presupuesto según la zona.", duracion: 30, precio: null },
    { nombre: "Cuerpo completo", descripcion: "Piernas, cavado, axilas y bozo.", duracion: 60, precio: null },
    { nombre: "Bozo y cejas", descripcion: "Perfilado y depilación del rostro.", duracion: 15, precio: null },
  ],
  pestanas: [
    { nombre: "Perfilado de cejas", descripcion: "Diseño según tu rostro.", duracion: 30, precio: 500 },
    { nombre: "Lifting de pestañas", descripcion: "Curvatura natural que dura semanas.", duracion: 60, precio: 1200 },
    { nombre: "Extensiones de pestañas", descripcion: "Pelo a pelo o volumen ruso.", duracion: 120, precio: null },
    { nombre: "Laminado de cejas", descripcion: "Cejas más prolijas y con más cuerpo.", duracion: 45, precio: null },
    { nombre: "Tinte de cejas y pestañas", descripcion: "Te pasamos precio según el servicio.", duracion: 30, precio: null },
  ],
  masajes: [
    { nombre: "Masaje descontracturante", descripcion: "Espalda, cuello y hombros.", duracion: 60, precio: 1500 },
    { nombre: "Masaje relajante", descripcion: "Cuerpo completo, con aceites.", duracion: 60, precio: 1400 },
    { nombre: "Drenaje linfático", descripcion: "Te recomendamos la cantidad de sesiones.", duracion: 60, precio: null },
    { nombre: "Piedras calientes", descripcion: "Masaje con piedras volcánicas.", duracion: 75, precio: null },
    { nombre: "Día de spa", descripcion: "Combinación de tratamientos a medida.", duracion: 120, precio: null },
  ],
  estetica: [
    { nombre: "Limpieza facial profunda", descripcion: "Extracción, mascarilla e hidratación.", duracion: 60, precio: 1500 },
    { nombre: "Perfilado de cejas", descripcion: "Diseño según tu rostro.", duracion: 30, precio: 500 },
    { nombre: "Tratamientos faciales", descripcion: "Peeling, hidratación, antiage: según tu piel.", duracion: 60, precio: null },
    { nombre: "Tratamientos corporales", descripcion: "Reductores y reafirmantes, con evaluación previa.", duracion: 60, precio: null },
    { nombre: "Depilación", descripcion: "Te pasamos precio según la zona.", duracion: 30, precio: null },
  ],
};

/** Los servicios de la plantilla con los textos del rubro (peluquería y barbería, sin cambios). */
export function serviciosDe(rubro: Rubro, base: Servicio[]): Servicio[] {
  const textos = SERVICIOS[rubro];
  if (!textos) return base;
  return base.map((s, i) => (textos[i] ? { ...s, ...textos[i] } : s));
}

// Fotos genéricas de Unsplash por rubro (la primera es la más apta para portada).
const FOTOS: Record<Rubro, { alt: string; ids: string[] }> = {
  unas: {
    alt: "Salón de uñas",
    ids: ["1658492055212-e1acbccfca5a", "1619607146034-5a05296c8f9a", "1632345031435-8727f6897d53", "1688583417770-ff6cc18071dc", "1659391542239-9648f307c0b1", "1746607242420-12fc2604775d", "1660505102581-85cffa4e6550", "1666226398826-5b7ae0111e9a"],
  },
  depilacion: {
    alt: "Depilación con cera",
    ids: ["1787651343620-8d5303006ecb", "1677091508049-d8ae041b1582", "1696192410531-dc179772a0e8", "1700760934166-4c766d708139", "1618322796571-94a011748223", "1711562963748-68e34987967a", "1786937680099-779e1da6f7f7"],
  },
  pestanas: {
    alt: "Pestañas y cejas",
    ids: ["1718720410649-7524fcb0f0a5", "1589710751893-f9a6770ad71b", "1735151226446-1d364b4adc2f", "1735151225764-eac694642dbf", "1674049406467-824ea37c7184", "1674049406179-d7bf2c263e71", "1548902378-2ec44c906391", "1709477542153-5bedab2b5657"],
  },
  masajes: {
    alt: "Masajes",
    ids: ["1639162906614-0603b0ae95fd", "1600334089648-b0d9d3028eb2", "1696841212541-449ca29397cc", "1544161515-4ab6ce6db874", "1519823551278-64ac92734fb1", "1706795033728-9232ef548a16", "1712638932314-e2b185ca0930", "1741522509438-a120c0bb5e88"],
  },
  estetica: {
    alt: "Tratamiento de estética",
    ids: ["1596740926849-2d473dee8d60", "1616394584738-fc6e612e71b9", "1570172619644-dfd03ed5d881", "1731514771613-991a02407132", "1552693673-1bf958298935", "1713085085470-fba013d67e65", "1683408640631-2c99fff964d7", "1728949202477-bad2935775cb"],
  },
  peluqueria: {
    alt: "Peluquería",
    ids: ["1633681926022-84c23e8cb2d6", "1634449571010-02389ed0f9b0", "1580618672591-eb180b1a973f", "1562322140-8baeececf3df", "1629397685944-7073f5589754", "1700760934268-8aa0ef52ce0a", "1600948836101-f9ffda59d250", "1521590832167-7bcbfaa6381f"],
  },
  barberia: {
    alt: "Barbería",
    ids: ["1585747860715-2ba37e788b70", "1647140655214-e4a2d914971f", "1503951914875-452162b0f3f1", "1621605815971-fbc98d665033", "1621645582931-d1d3e6564943", "1657105052497-f996284ffff8", "1592647420148-bfcc177e2117", "1593702275687-f8b402bf1fb5", "1635273051839-003bf06a8751"],
  },
};

/**
 * Fotos genéricas del rubro: portada y 4 de galería, distintas entre sí. El punto de partida sale
 * del slug, así dos demos del mismo rubro no muestran lo mismo, pero cada demo siempre ve las mismas.
 */
export function fotosGenericas(rubro: Rubro, slug: string): { portada: Foto; galeria: Foto[] } {
  const { alt, ids } = FOTOS[rubro];
  let h = 0;
  for (const c of slug) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  const fotos = ids.map((_, i) => {
    const id = ids[(h + i) % ids.length];
    return { src: `https://images.unsplash.com/photo-${id}`, alt: `${alt} (foto ilustrativa)` };
  });
  return { portada: fotos[0], galeria: fotos.slice(1, 5) };
}
