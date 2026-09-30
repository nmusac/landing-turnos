// Arma un Negocio a partir de una fila de la hoja "prospectos" (ver demos/README.md).
// Todo lo que la fila deja vacío sale de la plantilla base (negocio.config.ts).
import type { Foto, Horarios, Negocio } from "@/negocio.config";
import { aWhatsapp } from "./formato";

export type FilaProspecto = Record<string, string | undefined>;

const sinTildes = (s: string) => s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();

// También en inglés, por si Apify devuelve los horarios en ese idioma.
const DIAS: Record<string, number> = {
  dom: 0, lun: 1, mar: 2, mie: 3, jue: 4, vie: 5, sab: 6,
  sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6,
};

const hora = (h: string, m?: string) => `${h.padStart(2, "0")}:${m ?? "00"}`;

/**
 * Lee horarios en texto libre: "mar-vie 10:00-13:00 14:30-20:00; sab 9-16; dom cerrado".
 * Días por sus tres primeras letras, rangos con "-" o "a", listas con coma.
 * Devuelve null si no entiende nada (se usa el horario de la plantilla).
 */
export function leerHorarios(texto: string): Horarios | null {
  const h: Horarios = {};
  let entendido = false;
  for (const parte of sinTildes(texto).split(/[;\n]/)) {
    const corte = parte.search(/\d|cerrado/);
    if (corte <= 0) continue;
    const dias = new Set<number>();
    for (const item of parte.slice(0, corte).split(",")) {
      const [desde, hasta] = item.split(/\s*(?:-|–| a )\s*/).map((d) => DIAS[d.trim().slice(0, 3)]);
      if (desde === undefined) continue;
      if (hasta === undefined) dias.add(desde);
      else for (let d = desde; ; d = (d + 1) % 7) {
        dias.add(d);
        if (d === hasta) break;
      }
    }
    const franjas: [string, string][] = [];
    for (const m of parte.slice(corte).matchAll(/(\d{1,2})(?:[:.](\d{2}))?\s*(?:-|–|a)\s*(\d{1,2})(?:[:.](\d{2}))?/g)) {
      franjas.push([hora(m[1], m[2]), hora(m[3], m[4])]);
    }
    for (const d of dias) h[d as keyof Horarios] = franjas;
    if (dias.size) entendido = true;
  }
  return entendido ? h : null;
}

/** Links de Drive → imagen directa; fotos de Google Maps → tamaño grande. */
export function normalizarFoto(url: string): string {
  const drive = url.match(/drive\.google\.com\/(?:file\/d\/|open\?id=|uc\?(?:export=\w+&)?id=)([\w-]+)/);
  if (drive) return `https://lh3.googleusercontent.com/d/${drive[1]}`;
  if (/googleusercontent\.com/.test(url)) return url.replace(/=w\d+-h\d+/, "=w1600-h1200");
  return url;
}

const leerFotos = (texto: string | undefined, alt: string): Foto[] =>
  (texto ?? "")
    .split(/[\s,]+/)
    .filter((u) => /^https:\/\//.test(u))
    .map((u, i) => ({ src: normalizarFoto(u), alt: `${alt} ${i + 1}` }));

const esColor = (c: string | undefined): c is string => !!c && /^#[0-9a-f]{6}$/i.test(c.trim());

/** Texto claro u oscuro según qué contraste mejor sobre el color dado. */
function textoSobre(fondo: string, claro: string, oscuro: string) {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(fondo.slice(i, i + 2), 16) / 255);
  const lin = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b) > 0.35 ? oscuro : claro;
}

function usuarioInstagram(v: string | undefined) {
  if (!v) return undefined;
  const url = v.match(/instagram\.com\/([\w.]+)/);
  return (url ? url[1] : v.trim().replace(/^@/, "")) || undefined;
}

/** Solo celulares uruguayos (09…) tienen WhatsApp; un fijo no. */
function whatsappDe(...valores: (string | undefined)[]) {
  for (const v of valores) {
    if (!v) continue;
    const d = aWhatsapp(v);
    if (/^5989\d{7}$/.test(d)) return d;
  }
  return undefined;
}

export function negocioDesdeProspecto(f: FilaProspecto, base: Negocio): Negocio | null {
  const t = (k: string) => f[k]?.trim() || undefined;
  const slug = t("slug");
  const nombre = t("nombre");
  if (!slug || !nombre) return null;

  const barrio = t("barrio") ?? "";
  const ciudad = t("ciudad") ?? base.ciudad;
  const rubro = t("rubro") ?? "Peluquería";
  const fotos = leerFotos(f.foto_portada, `Foto de ${nombre}`);
  const galeria = leerFotos(f.fotos_galeria, `Foto de ${nombre}`);
  const hero = esColor(f.color_hero) ? f.color_hero.trim() : base.tema.hero;
  const acento = esColor(f.color_acento) ? f.color_acento.trim() : base.tema.acento;

  return {
    ...base,
    slug,
    nombre,
    rubro,
    frase: t("frase") ?? `${rubro} en ${barrio || ciudad}.`,
    presentacion: `Elegí el servicio, el día y la hora, y reservá tu turno en ${nombre} sin llamar. Te confirmamos en el momento.`,
    direccion: t("direccion") ?? "",
    barrio,
    ciudad,
    telefono: t("telefono") ?? "",
    whatsapp: whatsappDe(t("whatsapp"), t("telefono")),
    instagram: usuarioInstagram(t("instagram")),
    email: undefined,
    emailAvisos: t("email_avisos"),
    horarios: (t("horarios") && leerHorarios(t("horarios")!)) || base.horarios,
    // Un solo profesional: el paso "Con quién" no aparece.
    profesionales: [{ id: "local", nombre }],
    fotos: {
      portada: fotos[0] ?? galeria[0] ?? base.fotos.portada,
      galeria: galeria.length ? galeria.slice(0, 4) : fotos.length > 1 ? fotos.slice(1, 5) : base.fotos.galeria,
    },
    tema: {
      ...base.tema,
      hero,
      sobreHero: textoSobre(hero, base.tema.sobreHero, base.tema.texto),
      acento,
      sobreAcento: textoSobre(acento, "#FFFFFF", base.tema.sobreAcento),
    },
    esDemo: true,
  };
}
