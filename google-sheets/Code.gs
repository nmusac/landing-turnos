// Backend provisorio de landing-turnos sobre Google Sheets.
// Instalación y actualización: ver google-sheets/README.md.
//
// El sitio llama por POST con { secreto, accion, ... }. Las acciones que
// escriben corren bajo un candado, así "ver si el horario está libre y guardar"
// es un solo paso y dos clientes no pueden tomar el mismo turno. Las lecturas
// no esperan al candado, para que la página cargue rápido.

// Las columnas nuevas van siempre al final, para no desalinear filas existentes.
const HOJAS = {
  reservas: ['id', 'negocio', 'fecha', 'hora', 'profesional_id', 'servicio_id', 'cliente_nombre', 'cliente_telefono', 'nota', 'estado', 'inicio', 'fin', 'creada', 'cliente_email', 'origen'],
  bloqueos: ['id', 'negocio', 'profesional_id', 'inicio', 'fin', 'motivo'],
};

// Solo en la planilla de demos de la agencia (ver demos/README.md).
const PROSPECTOS = ['slug', 'nombre', 'rubro', 'frase', 'direccion', 'barrio', 'ciudad', 'telefono', 'whatsapp', 'instagram', 'foto_portada', 'fotos_galeria', 'horarios', 'color_hero', 'color_acento', 'email_avisos', 'estilo'];

/** Correr desde el editor al instalar y después de cada actualización: crea o completa las hojas. */
function configurar() {
  Object.keys(HOJAS).forEach(function (nombre) { prepararHoja(nombre, HOJAS[nombre]); });
  const props = PropertiesService.getScriptProperties();
  if (!props.getProperty('SECRETO')) props.setProperty('SECRETO', Utilities.getUuid());
  Logger.log('Emails disponibles hoy: ' + MailApp.getRemainingDailyQuota());
  Logger.log('Copiá este valor en GOOGLE_SHEETS_SECRET: ' + props.getProperty('SECRETO'));
}

/** Solo en la planilla de demos: además crea la hoja de prospectos. */
function configurarDemos() {
  configurar();
  prepararHoja('prospectos', PROSPECTOS);
}

function prepararHoja(nombre, columnas) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const hoja = ss.getSheetByName(nombre) || ss.insertSheet(nombre);
  hoja.getRange(1, 1, 1, columnas.length).setValues([columnas]).setFontWeight('bold');
  hoja.setFrozenRows(1);
  // Todo como texto: si no, Sheets convierte fechas y le saca el 0 a los teléfonos.
  hoja.getRange(1, 1, hoja.getMaxRows(), columnas.length).setNumberFormat('@');
}

function doPost(e) {
  let pedido;
  try {
    pedido = JSON.parse(e.postData.contents);
  } catch (err) {
    return responder({ error: 'pedido inválido' });
  }
  if (!pedido.secreto || pedido.secreto !== PropertiesService.getScriptProperties().getProperty('SECRETO')) {
    return responder({ error: 'no autorizado' });
  }
  const accion = ACCIONES[pedido.accion];
  if (!accion) return responder({ error: 'acción desconocida' });
  if (!pedido.negocio && SIN_NEGOCIO.indexOf(pedido.accion) === -1) return responder({ error: 'falta negocio' });

  const candado = ESCRIBEN.indexOf(pedido.accion) !== -1 ? LockService.getScriptLock() : null;
  if (candado) candado.waitLock(20000);
  try {
    return responder({ ok: true, datos: accion(pedido) });
  } catch (err) {
    return responder({ error: String(err && err.message ? err.message : err) });
  } finally {
    if (candado) candado.releaseLock();
  }
}

function responder(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function hoja(nombre) {
  return SpreadsheetApp.getActiveSpreadsheet().getSheetByName(nombre);
}

/** Filas como objetos, con su número de fila para poder editarlas. */
function filas(nombre) {
  const h = hoja(nombre);
  if (!h) return [];
  const valores = h.getDataRange().getDisplayValues();
  const columnas = valores[0];
  return valores.slice(1).map(function (v, i) {
    const obj = { _fila: i + 2 };
    columnas.forEach(function (c, j) { obj[c] = v[j]; });
    return obj;
  });
}

function agregar(nombre, obj) {
  const columnas = nombre === 'prospectos' ? PROSPECTOS : HOJAS[nombre];
  const h = hoja(nombre);
  h.getRange(h.getLastRow() + 1, 1, 1, columnas.length)
    .setNumberFormat('@')
    .setValues([columnas.map(function (c) { return obj[c] == null ? '' : String(obj[c]); })]);
  return obj;
}

function superpone(x, desde, hasta) {
  return new Date(x.inicio).getTime() < new Date(hasta).getTime() && new Date(x.fin).getTime() > new Date(desde).getTime();
}

function limpiar(obj) {
  const r = {};
  Object.keys(obj).forEach(function (k) { if (k !== '_fila') r[k] = obj[k]; });
  return r;
}

function reservasConfirmadas(p) {
  return filas('reservas').filter(function (r) { return r.negocio === p.negocio && r.estado === 'confirmada'; });
}

const ESCRIBEN = ['crearReserva', 'cancelarReserva', 'crearBloqueo', 'borrarBloqueo', 'guardarProspecto'];
const SIN_NEGOCIO = ['prospecto', 'guardarProspecto', 'enviarEmail'];

const ACCIONES = {
  /** Reservas confirmadas y bloqueos que se superponen con [desde, hasta), en un solo pedido. */
  ocupaciones: function (p) {
    return {
      reservas: reservasConfirmadas(p)
        .filter(function (r) { return superpone(r, p.desde, p.hasta); })
        .sort(function (a, b) { return a.inicio < b.inicio ? -1 : 1; })
        .map(limpiar),
      bloqueos: filas('bloqueos')
        .filter(function (b) { return b.negocio === p.negocio && superpone(b, p.desde, p.hasta); })
        .map(limpiar),
    };
  },

  crearReserva: function (p) {
    const n = p.reserva;
    const choca = reservasConfirmadas(p).some(function (r) {
      return r.profesional_id === n.profesional_id && superpone(r, n.inicio, n.fin);
    });
    if (choca) throw new Error('ocupado');
    return agregar('reservas', Object.assign({}, n, {
      id: Utilities.getUuid(),
      negocio: p.negocio,
      estado: 'confirmada',
      creada: new Date().toISOString(),
    }));
  },

  cancelarReserva: function (p) {
    const r = reservasConfirmadas(p).filter(function (x) { return x.id === p.id; })[0];
    if (!r) return null;
    hoja('reservas').getRange(r._fila, HOJAS.reservas.indexOf('estado') + 1).setValue('cancelada');
    r.estado = 'cancelada';
    return limpiar(r);
  },

  crearBloqueo: function (p) {
    return agregar('bloqueos', Object.assign({}, p.bloqueo, { id: Utilities.getUuid(), negocio: p.negocio }));
  },

  borrarBloqueo: function (p) {
    const b = filas('bloqueos').filter(function (x) { return x.negocio === p.negocio && x.id === p.id; })[0];
    if (b) hoja('bloqueos').deleteRow(b._fila);
    return null;
  },

  /** Fila de la hoja "prospectos" para armar una demo, o null. */
  prospecto: function (p) {
    const slug = String(p.slug || '').trim().toLowerCase();
    const f = filas('prospectos').filter(function (x) { return String(x.slug).trim().toLowerCase() === slug; })[0];
    return f ? limpiar(f) : null;
  },

  /**
   * Agrega un prospecto (lo usa el flujo de n8n). Si el slug ya existe no toca
   * nada, así no se pisan las correcciones hechas a mano en la planilla.
   */
  guardarProspecto: function (p) {
    const f = p.prospecto || {};
    const slug = String(f.slug || '').trim().toLowerCase();
    if (!/^[a-z0-9-]{1,80}$/.test(slug) || !String(f.nombre || '').trim()) throw new Error('prospecto inválido');
    if (!hoja('prospectos')) throw new Error('falta la hoja prospectos: ejecutá configurarDemos');
    const existe = filas('prospectos').some(function (x) { return String(x.slug).trim().toLowerCase() === slug; });
    if (existe) return { creado: false, slug: slug };
    agregar('prospectos', Object.assign({}, f, { slug: slug }));
    return { creado: true, slug: slug };
  },

  /** Sale de la cuenta de Google dueña de la planilla. */
  enviarEmail: function (p) {
    const e = p.email || {};
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.para || '')) throw new Error('email inválido');
    if (MailApp.getRemainingDailyQuota() < 1) throw new Error('se terminó la cuota diaria de emails');
    const opciones = { to: e.para, subject: e.asunto, htmlBody: e.html, name: e.remitente };
    if (e.responderA) opciones.replyTo = e.responderA;
    MailApp.sendEmail(opciones);
    return null;
  },
};
