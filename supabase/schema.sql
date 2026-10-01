-- Una sola base para todos los clientes: cada sitio filtra por su columna `negocio`
-- (el `slug` de negocio.config.ts). Correr una vez en Supabase > SQL Editor.

create extension if not exists btree_gist;

create table if not exists reservas (
  id uuid primary key default gen_random_uuid(),
  negocio text not null,
  profesional_id text not null,
  servicio_id text not null,
  inicio timestamptz not null,
  fin timestamptz not null,
  cliente_nombre text not null,
  cliente_telefono text, -- obligatorio desde la web; opcional si lo carga el local
  cliente_email text,
  nota text,
  origen text not null default 'web' check (origen in ('web', 'local')),
  estado text not null default 'confirmada' check (estado in ('confirmada', 'cancelada')),
  creada timestamptz not null default now(),
  check (fin > inicio),
  -- La base rechaza dos turnos confirmados superpuestos para el mismo profesional,
  -- aunque dos clientes confirmen en el mismo segundo.
  constraint sin_superposicion exclude using gist (
    negocio with =,
    profesional_id with =,
    tstzrange(inicio, fin) with &&
  ) where (estado = 'confirmada')
);

create index if not exists reservas_negocio_inicio on reservas (negocio, inicio);

create table if not exists bloqueos (
  id uuid primary key default gen_random_uuid(),
  negocio text not null,
  profesional_id text, -- null = todo el local
  inicio timestamptz not null,
  fin timestamptz not null,
  motivo text,
  check (fin > inicio)
);

create index if not exists bloqueos_negocio_inicio on bloqueos (negocio, inicio);

-- Demos para prospectos (ver demos/README.md). Una fila por prospecto; la carga
-- el flujo de n8n y se puede corregir a mano en Table Editor. Mismas columnas que
-- la hoja "prospectos" de la planilla, para poder importarla como CSV.
create table if not exists prospectos (
  slug text primary key check (slug ~ '^[a-z0-9-]{1,80}$'),
  nombre text not null,
  rubro text,
  frase text,
  direccion text,
  barrio text,
  ciudad text,
  telefono text,
  whatsapp text,
  instagram text,
  foto_portada text,
  fotos_galeria text,
  horarios text,
  color_hero text,
  color_acento text,
  email_avisos text,
  estilo text check (estilo is null or estilo in ('', 'verde', 'noche', 'salon')),
  creado timestamptz not null default now()
);

-- Link a la demo, calculado a partir del slug (no se carga a mano ni desde n8n).
-- Si cambia la dirección del sitio de demos, borrar la columna y volver a crearla.
alter table prospectos add column if not exists link text
  generated always as ('https://landing-turnos-six.vercel.app/demo/' || slug) stored;

-- RLS activado y sin políticas: la clave pública no puede leer ni escribir nada.
-- Solo el servidor de cada sitio (y n8n), con la clave secreta, accede a estas tablas.
alter table reservas enable row level security;
alter table bloqueos enable row level security;
alter table prospectos enable row level security;
