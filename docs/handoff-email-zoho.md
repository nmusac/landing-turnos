# Handoff: enviar los emails de la landing de turnos por Zoho (SMTP)

> **Implementado el 2026-10-02** (`src/lib/email.ts`, nodemailer 10): con `SMTP_HOST`, `SMTP_USER`,
> `SMTP_PASS` y `EMAIL_FROM` definidas, los emails salen por SMTP con versión HTML + texto simple; si no,
> por Apps Script. Probado contra un servidor SMTP de prueba. Falta verificar con Zoho real (pasos 2–6 de
> "Verificación").

## Contexto

- Proyecto: landing con reserva de turnos para peluquerías. Repo `github.com/nmusac/landing-turnos`
  (rama `main`; cada push publica en Vercel: `https://landing-turnos-six.vercel.app`).
- Stack: **Next.js 16** (App Router), TypeScript, Tailwind 4, Supabase (datos), Vercel (hosting).
  Leer `AGENTS.md`: esta versión de Next tiene cambios; las guías están en `node_modules/next/dist/docs/`.
- **Problema:** hoy los emails salen desde una cuenta de Gmail genérica (`confirmacion4567@gmail.com`)
  a través de un Apps Script (MailApp) y **llegan a spam**: cuenta nueva, sin dominio propio, nombre del
  remitente distinto de la dirección.
- **Objetivo:** enviar por **SMTP de Zoho Mail** desde el dominio `parrotshopstore.com`, que ya tiene SPF
  (`v=spf1 include:zoho.com include:shops.shopify.com ~all`) y DKIM (selector `zoho._domainkey`).
  Plan de Zoho: Mail Lite / básico de 1 usuario (incluye SMTP).
- **Remitente acordado:** un **alias** `turnos@parrotshopstore.com` del usuario existente
  (`info@parrotshopstore.com`), para no mezclar los emails de la landing con la casilla principal de la
  tienda. Nombre visible: el del local, ej. `Fortuna Unisex <turnos@parrotshopstore.com>`.

## Cómo funciona hoy el envío

- `src/lib/aviso.ts` arma los emails y los manda después de responder al usuario (`after()` de
  `next/server`), junto con un webhook opcional a n8n. Reglas:
  - reserva web → email al local (`emailAvisos` del negocio / columna `email_avisos` en Supabase
    `prospectos` para las demos) **y** confirmación al cliente;
  - turno cargado a mano en el panel → solo confirmación al cliente, si tiene email;
  - cancelación desde el panel → email al cliente.
  Los fallos se registran con `console.error` y **no** cortan la reserva.
- `src/lib/email.ts` es el único punto de envío:

  ```ts
  export type Email = {
    para: string;
    asunto: string;
    html: string;
    remitente: string; // nombre que ve el destinatario ("Fortuna Unisex")
    responderA?: string;
  };
  export async function enviarEmail(e: Email) { /* hoy: Apps Script (MailApp) o console.log en dev */ }
  ```
- Variables actuales relacionadas: `GOOGLE_SHEETS_URL`, `GOOGLE_SHEETS_SECRET` (Apps Script, hoy solo se
  usa para enviar emails; los datos ya están en Supabase).

## Pasos del usuario (Zoho + Vercel)

1. **Crear el alias** `turnos@parrotshopstore.com`: Zoho Mail Admin Console → **Users** → el usuario
   `info@` → **Mail Aliases / Email alias** → agregar `turnos@parrotshopstore.com`. No ocupa otra licencia.
2. **Habilitar SMTP** para el usuario: Zoho Mail → **Settings → Mail Accounts → IMAP/POP/SMTP** →
   activar **IMAP Access** (en Zoho el SMTP se habilita junto con IMAP/POP).
3. **Contraseña de aplicación** (obligatoria si la cuenta tiene verificación en 2 pasos, recomendable
   siempre): `accounts.zoho.com` → **Security → App Passwords → Generate New Password** → nombre
   "Landing turnos". Copiarla.
4. **Servidor SMTP según el datacenter** de la cuenta (se ve en la URL de Zoho Mail):
   `mail.zoho.com` → `smtp.zoho.com`; `.eu` → `smtp.zoho.eu`; `.in` → `smtp.zoho.in`;
   `.com.au` → `smtp.zoho.com.au`. Puerto **465** (SSL). (Cuentas de organización con dominio propio:
   si `smtp.zoho.com` rechaza la autenticación, probar `smtppro.zoho.com`.)
5. **DMARC** (recomendado, si no existe): en el DNS de `parrotshopstore.com` agregar TXT en `_dmarc`:
   `v=DMARC1; p=none; rua=mailto:info@parrotshopstore.com`. Mejora la entrega en Gmail.
6. **Vercel → Settings → Environment Variables** (Production), y después **Redeploy**:

   | Variable | Valor | Tipo |
   |---|---|---|
   | `SMTP_HOST` | ej. `smtp.zoho.com` | Config |
   | `SMTP_PORT` | `465` | Config |
   | `SMTP_USER` | `info@parrotshopstore.com` (el usuario que inicia sesión) | Config |
   | `SMTP_PASS` | la contraseña de aplicación | **Secret** |
   | `EMAIL_FROM` | `turnos@parrotshopstore.com` (el alias que ve el destinatario) | Config |

   No borrar `GOOGLE_SHEETS_*` hasta confirmar que Zoho funciona (quedan como respaldo).

## Cambios de código

1. **Dependencia:** `npm i nodemailer` y `npm i -D @types/nodemailer`.
2. **`src/lib/email.ts`:**
   - Si `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS` y `EMAIL_FROM` están definidas → enviar con nodemailer:
     - `createTransport({ host, port, secure: port === 465, auth: { user, pass } })`, creado una vez por
       instancia (variable de módulo); `connectionTimeout`/`socketTimeout` de ~10 s.
     - `from: { name: e.remitente, address: EMAIL_FROM }`, `to: e.para`, `subject: e.asunto`,
       `html: e.html`, **`text`** (versión en texto simple, ver punto 3), `replyTo: e.responderA`.
   - Si no → comportamiento actual (Apps Script; o `console.log` en desarrollo). Orden: SMTP > Apps Script > consola.
   - Ruta de servidor Node (no Edge). `import "server-only"` se mantiene.
3. **Versión en texto simple** (ayuda contra el spam): agregar `texto` al tipo `Email` y generarlo en
   `src/lib/aviso.ts` junto al HTML (frases completas y los links escritos completos), en lugar de
   derivarlo quitando etiquetas.
4. **Ajustes de contenido** en `src/lib/aviso.ts` (opcionales, menor riesgo de spam): menos botones y más
   texto; asunto sin mayúsculas ni signos de exclamación (ya es así).
5. **Docs:** actualizar `.env.example` (variables nuevas), `README.md` (sección de emails) y
   `google-sheets/README.md` (la planilla pasa a ser respaldo).

## Verificación

1. `npx tsc --noEmit`, `npx eslint src`, `npx next build`.
2. En local, con las variables SMTP en `.env.local` (no commitear): reservar en una demo con un email
   propio → llega la confirmación desde `Fortuna Unisex <turnos@parrotshopstore.com>`.
3. En Gmail, abrir el email → ⋮ → **Mostrar original**: `SPF: PASS`, `DKIM: PASS` (dominio
   `parrotshopstore.com`) y, si se agregó, `DMARC: PASS`. Verificar que no cae en spam.
4. Cargar un email en `email_avisos` de una fila de Supabase → `prospectos`, esperar 1 minuto (caché) y
   reservar desde la web → llegan los dos emails (local y cliente).
5. Cancelar desde el panel → llega el aviso de cancelación al cliente.
6. Push a `main`, Redeploy en Vercel si se cambiaron variables, y repetir 2–5 en producción.

## Cuidados

- **No** commitear la contraseña ni ponerla en el código; solo en Vercel / `.env.local`.
- El dominio es de otro negocio (Parrot Shop): las quejas de spam afectan su reputación. Mantener
  volumen bajo y contenido claro; a futuro conviene un dominio propio de la agencia.
- Límites de envío de Zoho por plan (del orden de cientos por día): suficiente para demos y primeros
  clientes; si se acerca al límite, evaluar un servicio transaccional (Zoho ZeptoMail o Resend).
