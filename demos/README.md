# Demos personalizadas para prospectos

> **Con Supabase configurado** (`SUPABASE_URL` y `SUPABASE_SECRET_KEY` en el sitio de demos), los
> prospectos se leen de la tabla **`prospectos`** de Supabase (mismas columnas que la hoja de abajo;
> se editan en Table Editor) y las reservas de las demos también van a Supabase. La planilla queda
> solo para mandar los emails. Lo que sigue describe las columnas, que son las mismas en los dos.

Un único sitio de demos de la agencia muestra la landing de cada peluquería
prospectada con **su** nombre, dirección, fotos, horarios y colores, sin tocar
código ni publicar nada: cada prospecto es una fila de una planilla.

- Landing: `https://<sitio-de-demos>/demo/<slug>`. Abajo aparece una barrita "Vista previa: Verde ·
  Noche · Salón" para mostrarle al prospecto la misma web en los 3 estilos (también por link:
  `…/demo/<slug>?estilo=noche`). La barrita solo existe en las demos. La elección se recuerda para esa
  demo, así el panel (`/demo/<slug>/panel`) abre en el mismo estilo; el panel también tiene la barrita.
- Panel (para mostrarle al peluquero cómo ve sus turnos): `/demo/<slug>/panel`, con el PIN de demos.

Las reservas que se hagan en una demo quedan en la misma planilla, separadas por
slug: las de un prospecto no aparecen en otro.

## Armar el sitio de demos (una vez)

1. Crear una planilla "Demos" en la cuenta de Google de la agencia.
2. **Extensiones → Apps Script**, pegar `google-sheets/Code.gs` y ejecutar **`configurarDemos`**
   (crea `reservas`, `bloqueos` y `prospectos`). Publicar como aplicación web igual que en
   `google-sheets/README.md`.
3. Crear en Vercel un proyecto "demos" desde este mismo repo, con:
   ```
   DEMOS=1
   GOOGLE_SHEETS_URL=…/exec de la planilla Demos
   GOOGLE_SHEETS_SECRET=…
   PANEL_PIN=<PIN de demos, para mostrar el panel>
   SESSION_SECRET=…
   SITIO_URL=https://<sitio-de-demos>
   ```
   En los sitios de clientes `DEMOS` queda vacío y `/demo/*` da 404.

## Columnas de la hoja `prospectos`

Solo `slug` y `nombre` son obligatorias. Lo que quede vacío sale de la plantilla
(`src/negocio.config.ts`): servicios y precios, fotos, colores, horarios.

| Columna | Qué poner | Ejemplo |
|---|---|---|
| `slug` | Identificador del link: minúsculas, números y guiones | `barberia-el-tano` |
| `nombre` | Nombre del local | `Barbería El Tano` |
| `rubro` | Opcional (por defecto "Peluquería") | `Barbería` |
| `frase` | Opcional, bajo el nombre | `Cortes clásicos desde 1985.` |
| `direccion`, `barrio`, `ciudad` | Como en Google Maps | `Av. Brasil 2880`, `Pocitos`, `Montevideo` |
| `telefono` | Cualquier formato; si es celular (09…) se arma el botón de WhatsApp | `+598 98 765 432` |
| `whatsapp` | Solo si es distinto del teléfono | `098765432` |
| `instagram` | Usuario o link | `https://instagram.com/barberiaeltano` |
| `foto_portada` | Link de una foto | ver "Fotos" |
| `fotos_galeria` | Hasta 4 links, separados por coma o salto de línea | |
| `horarios` | Texto: días y franjas separados por `;` | `lun-vie 9:30-19:30; sáb 9 a 14; dom cerrado` |
| `estilo` | Opcional: `verde`, `noche` o `salon`. Vacío = según el rubro (barbería → noche; salón de belleza, estética, uñas → salon; resto → verde) | `salon` |
| `color_hero`, `color_acento` | Opcional, en hex. Solo se aplican al estilo de la fila | `#3B1F2B`, `#E8C547` |
| `email_avisos` | Opcional: si querés que te lleguen a vos los avisos de reservas de la demo | `vos@agencia.com` |

### Fotos

- **Google Maps (Apify):** los links `…googleusercontent.com/…` funcionan directo; el sitio pide la versión grande.
- **Instagram:** sus links vencen en horas. Descargar la foto, subirla a una carpeta de
  Google Drive compartida como "Cualquier persona con el enlace" y pegar el link de
  Drive (`drive.google.com/file/d/…`): el sitio lo convierte solo.
- **Subidas a mano:** igual que Instagram, vía Drive.
- Sin fotos, la demo usa las de la plantilla.

### Horarios

Días por sus tres primeras letras (`lun mar mie jue vie sab dom`, también en inglés),
rangos con `-` o `a`, listas con coma; horas `9`, `9:30` o `9.30`; `cerrado` para días
cerrados. Si no se entiende, se usa el horario de la plantilla (revisar la demo).

## Cargar prospectos desde n8n + Apify

**Ya está armado** en el flujo "Leads sin web - Google Maps" (ver `demos/HANDOFF-n8n.md`): solo hay
que completar el nodo **Configuración demos**. Lo de abajo queda como referencia.

En el flujo que ya trae los negocios de Google Maps con Apify (Google Maps Scraper,
con idioma **es** e imágenes activadas), agregar al final un nodo **Code** y un nodo
**Google Sheets → Append row** a la hoja `prospectos`. Código sugerido para el nodo Code:

```js
const slug = (s) => s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase()
  .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60);

return $input.all()
  .filter((i) => !i.json.website) // solo los que no tienen web
  .map(({ json: p }) => ({
    json: {
      slug: slug(p.title),
      nombre: p.title,
      direccion: p.street ?? p.address ?? "",
      barrio: p.neighborhood ?? "",
      ciudad: p.city ?? "",
      telefono: p.phone ?? "",
      instagram: "",
      foto_portada: p.imageUrl ?? "",
      fotos_galeria: (p.imageUrls ?? []).slice(1, 5).join("\n"),
      horarios: (p.openingHours ?? []).map((h) => `${h.day} ${h.hours}`).join("; "),
    },
  }));
```

Los nombres de campo (`title`, `street`, `imageUrls`, `openingHours`…) son los del
Google Maps Scraper de Apify; si tu actor devuelve otros, ajustalos. Revisá cada demo
antes de mandar el link: fotos que no sean del local, horarios que no se entendieron, etc.

## Cuando un prospecto contrata

Se le arma su propio sitio (ver "Dar de alta un cliente nuevo" en el README principal):
copiar los datos de su fila a `src/negocio.config.ts`, con sus servicios, precios y
profesionales reales, y su propia planilla de turnos.
