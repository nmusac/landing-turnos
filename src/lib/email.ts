import "server-only";
import { appsScriptConfigurado, llamarAppsScript } from "./appsScript";

export type Email = {
  para: string;
  asunto: string;
  html: string;
  remitente: string; // nombre que ve el destinatario ("Peluquería Ramírez")
  responderA?: string;
};

// Hoy los emails salen de la cuenta de Google dueña de la planilla (MailApp,
// gratis, ~100 por día). Al pasar a Supabase se agrega acá otro proveedor (ej. Resend).
export async function enviarEmail(e: Email) {
  if (appsScriptConfigurado()) {
    await llamarAppsScript("enviarEmail", { email: e });
    return;
  }
  const texto = e.html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  console.log(`[email sin enviar: falta Google Sheets] De: ${e.remitente} | Para: ${e.para} | ${e.asunto}\n  ${texto}`);
}
