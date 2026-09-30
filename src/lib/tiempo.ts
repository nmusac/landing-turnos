// Fechas como "YYYY-MM-DD" y horas como "HH:mm", siempre en la zona horaria
// del negocio. El servidor corre en UTC, así que toda conversión pasa por acá.

function partes(fecha: Date, zona: string) {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone: zona,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const p = Object.fromEntries(dtf.formatToParts(fecha).map((x) => [x.type, x.value]));
  return { y: +p.year, m: +p.month, d: +p.day, h: +p.hour, mi: +p.minute, s: +p.second };
}

function desfaseMinutos(fecha: Date, zona: string): number {
  const p = partes(fecha, zona);
  return (Date.UTC(p.y, p.m - 1, p.d, p.h, p.mi, p.s) - fecha.getTime()) / 60000;
}

const dos = (n: number) => String(n).padStart(2, "0");

/** Hora local del negocio → instante UTC. */
export function aUtc(fecha: string, hora: string, zona: string): Date {
  const [y, m, d] = fecha.split("-").map(Number);
  const [h, mi] = hora.split(":").map(Number);
  const supuesto = Date.UTC(y, m - 1, d, h, mi);
  return new Date(supuesto - desfaseMinutos(new Date(supuesto), zona) * 60000);
}

export function fechaLocal(instante: Date, zona: string): string {
  const p = partes(instante, zona);
  return `${p.y}-${dos(p.m)}-${dos(p.d)}`;
}

export function horaLocal(instante: Date, zona: string): string {
  const p = partes(instante, zona);
  return `${dos(p.h)}:${dos(p.mi)}`;
}

export function diaSemana(fecha: string): 0 | 1 | 2 | 3 | 4 | 5 | 6 {
  const [y, m, d] = fecha.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay() as 0 | 1 | 2 | 3 | 4 | 5 | 6;
}

export function sumarDias(fecha: string, dias: number): string {
  const [y, m, d] = fecha.split("-").map(Number);
  const r = new Date(Date.UTC(y, m - 1, d + dias));
  return `${r.getUTCFullYear()}-${dos(r.getUTCMonth() + 1)}-${dos(r.getUTCDate())}`;
}

export const aMinutos = (hora: string) => {
  const [h, m] = hora.split(":").map(Number);
  return h * 60 + m;
};

export const aHora = (minutos: number) => `${dos(Math.floor(minutos / 60))}:${dos(minutos % 60)}`;

export const esFecha = (s: unknown): s is string => typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s);
export const esHora = (s: unknown): s is string => typeof s === "string" && /^\d{2}:\d{2}$/.test(s);

const DIAS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

export const nombreDia = (fecha: string) => DIAS[diaSemana(fecha)];

/** "jueves 2 de octubre" */
export function fechaLarga(fecha: string): string {
  const [, m, d] = fecha.split("-").map(Number);
  return `${nombreDia(fecha)} ${d} de ${MESES[m - 1]}`;
}

/** "Hoy", "Mañana" o "jue 2" */
export function fechaCorta(fecha: string, hoy: string): string {
  if (fecha === hoy) return "Hoy";
  if (fecha === sumarDias(hoy, 1)) return "Mañana";
  const d = Number(fecha.slice(8));
  return `${nombreDia(fecha).slice(0, 3)} ${d}`;
}
