import "server-only";
import { createTransport, type Transporter } from "nodemailer";
import { appsScriptConfigurado, llamarAppsScript } from "./appsScript";

export type Email = {
  para: string;
  asunto: string;
  html: string;
  remitente: string; // nombre que ve el destinatario ("Peluquería Ramírez")
  responderA?: string;
};

// Cómo salen los emails, en este orden:
// 1. SMTP (ej. Zoho) si están SMTP_HOST, SMTP_USER, SMTP_PASS y EMAIL_FROM: sale
//    desde un dominio con SPF/DKIM, así no cae en spam.
// 2. Apps Script de la planilla (MailApp) si están GOOGLE_SHEETS_URL/SECRET.
// 3. En desarrollo, sin ninguno, se muestra en la consola.

// Sin espacios ni saltos de línea alrededor (errores comunes al pegar en Vercel).
const variable = (nombre: string) => process.env[nombre]?.trim() || undefined;

function smtp() {
  const [host, puerto, user, pass, desde] = ["SMTP_HOST", "SMTP_PORT", "SMTP_USER", "SMTP_PASS", "EMAIL_FROM"].map(variable);
  if (!host || !user || !pass || !desde) return null;
  if (/\s/.test(host)) throw new Error(`SMTP_HOST tiene un valor inválido: tiene que ser solo el servidor (ej. smtppro.zoho.com)`);
  return { host, port: Number(puerto) || 465, user, pass, desde };
}

let transporte: Transporter | undefined;

function transporteSmtp(c: NonNullable<ReturnType<typeof smtp>>) {
  return (transporte ??= createTransport({
    host: c.host,
    port: c.port,
    secure: c.port === 465, // 465 = SSL directo; 587 = STARTTLS
    auth: { user: c.user, pass: c.pass },
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 15_000,
  }));
}

/** Versión en texto simple del HTML (los filtros de spam desconfían de los emails solo HTML). */
export function htmlATexto(html: string) {
  return html
    .replace(/<a [^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi, (_, href: string, texto: string) => `${texto.trim()}: ${href}`)
    .replace(/<(p|h1|h2|table|div)[\s>]/gi, (m) => `\n${m}`)
    .replace(/<\/(p|h1|h2|tr|div)>|<br\s*\/?>/gi, "\n")
    .replace(/<\/td>/gi, " ")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/[ \t]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export async function enviarEmail(e: Email) {
  const c = smtp();
  if (c) {
    await transporteSmtp(c).sendMail({
      from: { name: e.remitente, address: c.desde },
      to: e.para,
      subject: e.asunto,
      html: e.html,
      text: htmlATexto(e.html),
      ...(e.responderA && { replyTo: e.responderA }),
    });
    return;
  }
  if (appsScriptConfigurado()) {
    await llamarAppsScript("enviarEmail", { email: e });
    return;
  }
  console.log(`[email sin enviar: falta SMTP o Google Sheets] De: ${e.remitente} | Para: ${e.para} | ${e.asunto}\n${htmlATexto(e.html)}`);
}
