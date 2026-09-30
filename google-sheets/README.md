# Backend provisorio en Google Sheets

Mientras no usemos Supabase, las reservas se guardan en una planilla de Google.
Una planilla por cliente: el dueño puede abrirla y ver sus turnos. La misma
planilla manda los emails de aviso (sale de la cuenta de Google dueña de la planilla).

## Instalación (una vez por cliente, ~5 minutos)

1. Crear una planilla nueva en Google Sheets (ej. "Turnos · Peluquería Ramírez").
2. Menú **Extensiones → Apps Script**. Borrar lo que haya y pegar todo `Code.gs`. Guardar.
3. Elegir la función `configurar` en la barra de arriba y tocar **Ejecutar**.
   Google pide permisos la primera vez (planilla y **enviar emails en tu nombre**):
   **Revisar permisos** → tu cuenta → si aparece "Google no verificó esta aplicación",
   **Configuración avanzada → Ir a (proyecto)** → **Permitir**. Es tu propio script.
   Crea las hojas `reservas` y `bloqueos`, y en el **Registro de ejecución** muestra el secreto.
4. **Implementar → Nueva implementación** → tipo **Aplicación web**:
   - Ejecutar como: **Yo**
   - Quién tiene acceso: **Cualquier usuario**
   Copiar la URL que termina en `/exec`.
5. En Vercel (o en `.env.local` para probar):
   ```
   GOOGLE_SHEETS_URL=https://script.google.com/macros/s/…/exec
   GOOGLE_SHEETS_SECRET=<el secreto del paso 3>
   ```

"Cualquier usuario" es necesario para que el sitio pueda llamarlo; sin el
secreto el script no devuelve, guarda ni envía nada.

¿Perdiste el secreto? En el editor de Apps Script: ⚙️ **Configuración del proyecto →
Propiedades de la secuencia de comandos → SECRETO**, o volvé a ejecutar `configurar`.

## Actualizar el script (cuando cambia `Code.gs`)

1. **Extensiones → Apps Script**, borrar todo y pegar el `Code.gs` nuevo. Guardar.
2. Ejecutar `configurar` otra vez: suma las columnas nuevas sin tocar las filas existentes
   (y pide permisos si el script nuevo usa algo más, como enviar emails).
3. **Implementar → Administrar implementaciones → ✏️ editar → Versión: Nueva versión → Implementar.**
   La URL se mantiene. Sin este paso el sitio sigue usando el script viejo.

## Cosas a saber

- **No editar ni reordenar columnas a mano.** Se puede mirar, filtrar y ordenar la vista,
  pero para cancelar, bloquear o agregar turnos conviene usar `/panel`.
- **Límite de emails:** una cuenta de Gmail manda hasta **100 emails por día**
  (Google Workspace: 1.500). Cada reserva desde la web usa 2 (al local y al cliente).
  El límite es **por cuenta**: si todas las planillas de clientes son de la misma cuenta,
  lo comparten. Con muchos clientes conviene que cada planilla sea de una cuenta distinta,
  o pasar a Supabase + un servicio de emails.
- El email al local va a `emailAvisos` de `negocio.config.ts`; si está vacío, no se manda.
- Cada consulta tarda ~1 segundo (es Google Apps Script). Alcanza para un local chico.
- Pasar a Supabase: correr `supabase/schema.sql`, importar las filas y cargar
  `SUPABASE_URL`/`SUPABASE_SECRET_KEY`. Si están definidas, el sitio usa Supabase
  aunque sigan las de Sheets. Las columnas se llaman igual en los dos. (Los emails
  por ahora siguen saliendo por Sheets: hay que sumar otro proveedor antes de sacarlo.)
