# Handoff: landing de turnos + demos automáticas desde el flujo "Leads sin web"

Documento para el agente que trabaja en n8n. Resume qué es la landing, cómo se arma una
**demo personalizada** para cada prospecto y qué hay que agregar al flujo
**"Leads sin web - Google Maps"** (id `wM9Di02RIMKbosRM`) para que las demos salgan solas
con el nombre, la dirección, las fotos y los horarios de cada negocio.

---

## 1. Qué es la landing

Producto de la agencia para peluquerías y barberías de Uruguay que no tienen web.
Repo: `C:\Users\n_mus\dev\landing-turnos` (Next.js 16 + Tailwind, se publica en Vercel).

- **Landing** (`/`): nombre y foto del local, "próximos turnos libres" tocables, lista de precios,
  galería de fotos, reserva en pasos (servicio → día y hora → datos), mapa, horarios, WhatsApp e Instagram.
- **Reservas:** turnos cada 15 min; online solo se reservan los cortes (pelo e infantil, 15 min).
  Los demás servicios dicen "Consultar" y abren WhatsApp con un mensaje escrito.
  El cliente deja nombre, celular y **email (obligatorio)**.
- **Panel del local** (`/panel`, con PIN): agenda de hoy más 21 días (o cualquier fecha), cancelar turnos,
  bloquear horarios y cargar turnos de clientes que reservan por teléfono.
- **Avisos por email** (salen de la planilla de Google con MailApp): reserva web → un email al local
  y otro al cliente; el local cancela → email al cliente. También se manda cada evento a un
  webhook opcional de n8n (`N8N_WEBHOOK_URL`, formato en el `README.md` del repo).
- **Datos (provisorio):** una planilla de Google por cliente con un Apps Script
  (`google-sheets/Code.gs`) publicado como aplicación web. Más adelante, Supabase.

Un cliente que contrata tiene **su propio sitio** (copia del repo con su `src/negocio.config.ts`).
Los **prospectos** no: se les muestra una demo del sitio compartido de demos.

## 2. Cómo funcionan las demos

- Un único sitio de demos (proyecto de Vercel con `DEMOS=1`) lee una planilla de Google
  **"Demos"** de la agencia, hoja **`prospectos`**: **una fila = un prospecto**.
- Link de la demo: `https://<sitio-de-demos>/demo/<slug>`; panel de muestra: `/demo/<slug>/panel`
  (PIN de demos).
- El sitio busca la fila por `slug` en cada visita (caché de 60 s): **agregar o editar una fila
  actualiza la demo sin publicar nada**.
- Lo que la fila deja vacío sale de la plantilla (servicios y precios, fotos, colores, horarios).
  Servicios y precios de la demo son siempre los de la plantilla.
- Las reservas de prueba de cada demo quedan en la misma planilla, separadas por slug.

### Columnas de la hoja `prospectos`

La fila se lee **por nombre de columna** (el orden no importa, los nombres sí). Solo `slug` y
`nombre` son obligatorias.

| Columna | Qué va | Cómo lo lee el sitio |
|---|---|---|
| `slug` | Id del link: solo `a-z`, `0-9` y `-`, máx. 80 | Tiene que ser único. Es la URL `/demo/<slug>` |
| `nombre` | Nombre del local | Título grande y textos |
| `rubro` | Ej. "Barbería" | Opcional; por defecto "Peluquería" |
| `frase` | Una línea bajo el nombre | Opcional; por defecto "<rubro> en <barrio o ciudad>." |
| `direccion` | Calle y número | Se muestra y se usa para el mapa |
| `barrio`, `ciudad` | | |
| `telefono` | Cualquier formato | Si es celular uruguayo (09… o +598 9…), arma solo el botón de WhatsApp |
| `whatsapp` | Solo si difiere del teléfono | |
| `instagram` | Usuario o link | Acepta `https://instagram.com/usuario/` o `@usuario` |
| `foto_portada` | 1 link de imagen | Ver "Fotos" |
| `fotos_galeria` | Hasta 4 links, separados por salto de línea o coma | Si falta, usa las fotos 2 a 5 de la portada o las de la plantilla |
| `horarios` | Texto, ver formato abajo | Si no se entiende, usa el horario de la plantilla |
| `estilo` | `verde`, `noche` o `salon` | Opcional; vacío = según el rubro (barbería → noche; salón de belleza/estética → salon; resto → verde). La demo tiene además un selector para ver los 3 |
| `color_hero`, `color_acento` | Hex `#RRGGBB` | Opcional; solo para el estilo de la fila; el color del texto encima se calcula solo |
| `email_avisos` | Email | Opcional: recibe los avisos de reservas hechas en la demo |

**Fotos:** los links de Google Maps (`…googleusercontent.com/…=w408-h306-…`) funcionan directo y el
sitio pide la versión grande. Los de Google Drive (`drive.google.com/file/d/<id>/…`, compartido
"cualquier persona con el enlace") se convierten solos. Los links de Instagram **vencen en horas**:
no sirven directo (hay que descargar la foto y subirla a Drive).

**Horarios:** tramos separados por `;`. En cada tramo, los días por sus 3 primeras letras (español o
inglés; rangos con `-`, listas con coma) y después las franjas en **24 h**:

```
lun-vie 09:30-13:00 15:00-19:30; sab 09:00-14:00; dom cerrado
```

El lector **no entiende "a. m./p. m."**: hay que pasarlo a 24 h en n8n (código abajo).

## 3. Cambios al flujo "Leads sin web - Google Maps"

> **Ya implementado (2026-09-30).** El flujo quedó así:
> `Formulario de búsqueda` → **`Configuración demos`** (Set: `sitio_demos`, `apps_script_url`,
> `apps_script_secreto`; vacío = no arma demos) → `Apify Google Maps Scraper` (ahora con `maxImages: 5`)
> → `Filtrar sin web propia y puntuar` (ahora pasa `_maps` con fotos, horarios, barrio y calle)
> → `Solo leads nuevos` → **`Armar demo`** (Code, el de 3.3) → dos ramas:
> **`Datos del lead`** → `Guardar leads` (tabla `leads_sin_web`, con la columna nueva **`link_demo`**) y
> **`Solo peluquerías con demo`** → **`Guardar en planilla Demos`** (HTTP POST al Apps Script, acción
> `guardarProspecto`, que agrega la fila solo si el slug no existe; si falla, el flujo sigue).
> En vez de un nodo de Google Sheets se usa el Apps Script de la planilla: no hace falta una
> credencial de Google en n8n y los duplicados se evitan dentro del script.
> Lo que sigue explica el diseño original.

Estado actual: `Formulario de búsqueda` → `Apify Google Maps Scraper` (HTTP a
`compass~crawler-google-places/run-sync-get-dataset-items`, `language: "es"`) →
`Filtrar sin web propia y puntuar` → `Solo leads nuevos` → `Guardar leads` (tabla `leads_sin_web`).

### 3.1 Pedir fotos a Apify

En el body del nodo **Apify Google Maps Scraper**, agregar `maxImages: 5` (así el actor devuelve
`imageUrls`; `imageUrl` ya viene siempre). Aumenta un poco el tiempo y el costo por lugar: si la
llamada síncrona se acerca a los 5 min, bajar "Cantidad máxima".

### 3.2 Conservar los datos de la demo en el filtro

En **Filtrar sin web propia y puntuar**, además de lo que ya guarda, pasar hacia adelante
`imageUrl`, `imageUrls`, `openingHours`, `neighborhood`, `street` y `categoryName`
(o armar ahí mismo la fila de la demo con el código de 3.3).

### 3.3 Armar la fila de `prospectos` (nodo Code nuevo)

Solo para rubros que la plantilla cubre (peluquería, barbería, estilista). Código sugerido,
**"Run once for all items"**; recibe los ítems crudos de Apify o los del filtro con esos campos:

```js
const SITIO_DEMOS = 'https://<sitio-de-demos>'; // completar cuando esté publicado
const sinTildes = (s) => String(s || '').normalize('NFD').replace(/\p{M}/gu, '');

// Único y estable: nombre + últimos 4 caracteres del place_id.
const slugDe = (nombre, id) =>
  sinTildes(nombre).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 50) +
  '-' + String(id).replace(/[^a-z0-9]/gi, '').slice(-4).toLowerCase();

// "10 a. m." / "8:30 p.m." / "20:00" / "9" -> "HH:MM" (24 h). null si no se entiende.
function a24(t, sufijoPorDefecto) {
  const m = sinTildes(t).toLowerCase().replace(/\s+/g, ' ').trim()
    .match(/^(\d{1,2})(?:[:.](\d{2}))?\s*(a\.? ?m\.?|p\.? ?m\.?)?$/);
  if (!m) return null;
  let h = Number(m[1]);
  const suf = m[3] ? m[3][0] : sufijoPorDefecto; // 'a' | 'p' | undefined
  if (suf === 'p' && h < 12) h += 12;
  if (suf === 'a' && h === 12) h = 0;
  return String(h).padStart(2, '0') + ':' + (m[2] || '00');
}

// openingHours de Apify ([{ day: "lunes", hours: "9 a. m.–1 p. m., 3–7:30 p. m." }]) -> texto del sitio.
function horarios(oh) {
  if (!Array.isArray(oh) || !oh.length) return '';
  const tramos = [];
  for (const { day, hours } of oh) {
    const d = sinTildes(day).toLowerCase().slice(0, 3);
    const h = sinTildes(hours).toLowerCase();
    if (/cerrado|closed/.test(h)) { tramos.push(`${d} cerrado`); continue; }
    if (/24 horas|24 hours/.test(h)) { tramos.push(`${d} 00:00-23:59`); continue; }
    const franjas = [];
    for (const f of h.split(/,|\s+y\s+/)) {
      // Apify a veces devuelve "10:30 AM to 7 PM" (en inglés, aunque el idioma sea "es").
      const [a, b] = f.split(/\s*[–—-]\s*|\s+(?:a|to)\s+/);
      if (!a || !b) return ''; // formato raro: mejor dejar vacío y usar la plantilla
      const sufB = (b.match(/([ap])\.? ?m/) || [])[1];
      const fin = a24(b);
      const ini = a24(a, sufB); // "3–7 p. m." -> 15:00-19:00
      if (!ini || !fin) return '';
      franjas.push(`${ini}-${fin}`);
    }
    tramos.push(`${d} ${franjas.join(' ')}`);
  }
  return tramos.join('; ');
}

const esInstagram = (url) => /instagram\.com\//i.test(url || '');
const RUBROS = /peluquer|barber|estilista|salon de belleza|hair/i;

return $input.all()
  .map((i) => i.json)
  .filter((p) => RUBROS.test(sinTildes(p.categoryName || p.rubro || '')))
  .map((p) => {
    const id = p.placeId || p.place_id || p.url;
    // Street View muestra la calle, no el local: se usa solo si no hay otra foto.
    const todas = (p.imageUrls && p.imageUrls.length ? p.imageUrls : [p.imageUrl]).filter(Boolean);
    const delLocal = todas.filter((u) => !/streetviewpixels/.test(u));
    const fotos = delLocal.length ? delLocal : todas;
    const slug = slugDe(p.title || p.nombre, id);
    const web = p.website || p.link_actual || '';
    return {
      json: {
        place_id: id,
        link_demo: `${SITIO_DEMOS}/demo/${slug}`,
        prospecto: {
          slug,
          nombre: p.title || p.nombre,
          rubro: p.categoryName || '',
          direccion: p.street || p.address || p.direccion || '',
          barrio: p.neighborhood || '',
          ciudad: p.city || p.ciudad || '',
          telefono: p.phone || p.phoneUnformatted || p.telefono || '',
          instagram: esInstagram(web) ? web : '',
          foto_portada: fotos[0] || '',
          fotos_galeria: fotos.slice(1, 5).join('\n'),
          horarios: horarios(p.openingHours),
        },
      },
    };
  });
```

### 3.4 Guardar en la planilla y en la tabla de leads

1. **Google Sheets → Append row** en la planilla "Demos", hoja `prospectos`, mapeando
   `{{$json.prospecto.<columna>}}` a cada columna. **No pisar filas existentes**: antes, un
   "Get rows" (o un lookup) por `slug` y seguir solo si no existe. Las filas se pueden corregir a
   mano (fotos, colores, frase) y una nueva corrida no debe borrar esos cambios.
2. En la tabla **`leads_sin_web`**, agregar la columna **`link_demo`** y guardarla por `place_id`,
   para usarla en el mensaje de contacto al prospecto.

### 3.5 Revisión humana antes de contactar

Las fotos de Google Maps pueden ser de clientes, del frente, de un menú o de la calle. Conviene una
columna de estado (ej. `demo_revisada`) y que el mensaje al prospecto salga solo cuando alguien miró
la demo. Si el negocio tiene Instagram, se pueden reemplazar las fotos por las suyas (descargadas y
subidas a Drive).

## 4. Qué falta antes de que funcione de punta a punta

Tareas del dueño de la agencia (no del flujo):

1. Crear la planilla **"Demos"**, pegar `google-sheets/Code.gs`, ejecutar **`configurarDemos`**
   (crea `reservas`, `bloqueos` y `prospectos`) y publicarla como aplicación web
   (pasos en `google-sheets/README.md` y `demos/README.md`).
2. Publicar el **sitio de demos** en Vercel desde el mismo repo con `DEMOS=1`, la URL y el
   secreto de esa planilla, `PANEL_PIN`, `SESSION_SECRET` y `SITIO_URL`.
3. Pasarle al flujo la URL del sitio (`SITIO_DEMOS`) y acceso de escritura a la planilla "Demos"
   (credencial de Google Sheets en n8n).

## 5. Referencias en el repo

- `demos/README.md`: guía de demos y columnas de `prospectos`.
- `src/lib/prospecto.ts`: cómo se interpreta cada columna (horarios, fotos, Instagram, colores).
- `google-sheets/Code.gs`: script de la planilla (acción `prospecto` = buscar fila por slug).
- `src/negocio.config.ts`: la plantilla (servicios, precios, fotos y colores por defecto).
- `README.md`: producto completo, alta de clientes y formato del webhook.
