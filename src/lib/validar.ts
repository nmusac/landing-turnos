export const texto = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

export const esEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s);
