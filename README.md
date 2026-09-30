# Landing con reserva de turnos

Plantilla para peluquerías y barberías (u otros negocios con turnos). Cada cliente
es una copia de este repo con su propio `src/negocio.config.ts` y su propio
proyecto en Vercel. Por ahora las reservas se guardan en una planilla de Google
por cliente ([google-sheets/README.md](google-sheets/README.md)); más adelante van
a una misma base de Supabase, separadas por el `slug` del negocio.

- `/` landing: próximos turnos libres, servicios y precios, fotos, equipo, reserva, ubicación.
- `/panel` agenda del local, con PIN: turnos por día (hoy + 21 días, o cualquier fecha),
  cancelar, bloquear horarios y agregar turnos de clientes que reservan por teléfono.
- Avisos por email: cada reserva web le llega al local y al cliente; si el local cancela,
  le llega al cliente. Además, cada evento se manda al webhook de n8n (`N8N_WEBHOOK_URL`).
- `/demo/<slug>`: demos personalizadas para prospectos, desde una planilla
  (solo en el sitio de demos de la agencia, ver [demos/README.md](demos/README.md)).

## Desarrollo

```bash
npm install
cp .env.example .env.local   # completar PANEL_PIN y SESSION_SECRET
npm run dev
```

Sin Google Sheets ni Supabase configurados, en desarrollo las reservas se guardan
en `.data/<slug>.json` y los emails se muestran en la consola. En producción hace falta uno de los dos.

## Base de datos provisoria: Google Sheets

Ver [google-sheets/README.md](google-sheets/README.md).

## Base de datos definitiva: Supabase (una vez)

1. Crear un proyecto en Supabase.
2. SQL Editor → pegar y correr `supabase/schema.sql`.
3. Project Settings → API keys: copiar la URL y una **secret key** (nunca la publishable).

## Dar de alta un cliente nuevo

1. Copiar el repo (GitHub → "Use this template" o `git clone` a un repo nuevo).
2. Editar `src/negocio.config.ts`:
   - `slug` único (ej. `barberia-el-tano`). No cambiarlo después: las reservas quedan atadas a él.
   - Textos, dirección, teléfono, WhatsApp (`598` + número sin el 0), Instagram.
   - `emailAvisos`: dónde recibe el local cada reserva nueva.
   - `horarios` por día (0 = domingo), `servicios` con duración y precio (`null` = "Consultar").
     Con `reservable: false` el servicio se muestra con un botón "Consultar" que abre WhatsApp
     y no se agenda online (el local igual puede cargarlo desde el panel).
   - `turnos`: cada cuántos minutos (`intervalo`), hasta cuántos días adelante, y
     `anticipacionMinima` (0 = se puede reservar el próximo turno libre de hoy).
   - Ojo: `intervalo` es cada cuánto puede **empezar** un turno (15 → 10:00, 10:15, 10:30…) y
     `duracion` es cuánto **ocupa** al profesional. Un servicio de 30 min reservado a las 10:00
     deja libre recién las 10:30. No bajar la duración para "alinearla": los turnos se pisarían.
   - `profesionales`: con uno solo, el paso "Con quién" no aparece.
   - Fotos: idealmente las del local, en `public/fotos/` y con `src: "/fotos/…"`.
   - `estilo`: `"verde"` (verde botella, títulos angostos), `"noche"` (barbería clásica: negro, crema
     y cobre, títulos en Playfair) o `"salon"` (peluquería femenina: rosa empolvado y bordó, títulos en
     Cormorant cursiva, bordes redondeados). Mismo contenido y fotos en los tres; están definidos en
     `src/lib/estilos.ts`.
   - `tema` (opcional): retocar colores sueltos del estilo, ej. `tema: { acento: "#B3261E" }`.
     Revisar contraste de `acento`/`sobreAcento` y `hero`/`sobreHero`.
3. Crear su planilla con el Apps Script (ver `google-sheets/README.md`).
4. Crear el proyecto en Vercel y cargar las variables de `.env.example`
   (PIN nuevo y `SESSION_SECRET` nuevo por cliente, y `SITIO_URL` con su dirección).
5. Conectar el dominio del cliente en Vercel.
6. Pasarle al dueño el link `/panel` y su PIN (y, si quiere, acceso de lectura a la planilla).

## Webhook de n8n

`POST` a `N8N_WEBHOOK_URL` con header `x-webhook-secret` (si está definido):

```json
{
  "evento": "reserva.creada",
  "negocio": { "slug": "peluqueria-ramirez", "nombre": "Peluquería Ramírez", "whatsapp": "59899123456", "email": null, "demo": false },
  "reserva": {
    "id": "…", "fecha": "2026-10-02", "hora": "17:30",
    "inicio": "2026-10-02T20:30:00.000Z", "fin": "2026-10-02T21:00:00.000Z",
    "servicio": "Corte de pelo", "profesional": "Héctor Ramírez",
    "cliente": { "nombre": "Juan", "telefono": "099 000 111", "email": "juan@gmail.com" },
    "nota": null,
    "origen": "web"
  }
}
```

`evento` puede ser `reserva.creada` o `reserva.cancelada` (cuando el local cancela desde el panel).
`origen` es `web` o `local` (cargado a mano desde el panel).
Si el webhook o un email fallan, la reserva igual queda guardada.
