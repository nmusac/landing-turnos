import type { Estilo } from "@/lib/estilos";

// Todo lo que cambia de un cliente a otro vive en este archivo.
// Para un negocio nuevo: clonar el repo, editar esto, cargar las variables
// de entorno y desplegar. Ver README.md.
// También es la plantilla base de las demos: lo que una fila de prospectos
// deja vacío (servicios, precios, fotos, colores…) sale de acá.

export type Servicio = {
  id: string;
  nombre: string;
  descripcion?: string;
  duracion: number; // minutos
  precio: number | null; // null = "Consultar"
  // false = se muestra con "Consultar" (botón a WhatsApp) y no se agenda online;
  // el local igual puede cargarlo desde el panel.
  reservable?: boolean;
};

export type Profesional = {
  id: string;
  nombre: string;
  rol?: string;
  foto?: string;
  // Si se omite, hace todos los servicios.
  servicios?: string[];
};

// Franjas de atención por día de la semana (0 = domingo … 6 = sábado).
// Un día sin franjas está cerrado.
export type Horarios = Partial<Record<0 | 1 | 2 | 3 | 4 | 5 | 6, [string, string][]>>;

export type Foto = { src: string; alt: string };

export type Tema = {
  hero: string; // fondo del encabezado
  sobreHero: string; // texto sobre el encabezado
  fondo: string; // fondo de la página
  superficie: string; // paneles y formularios
  texto: string;
  suave: string; // texto secundario
  linea: string; // bordes
  acento: string; // botones de acción
  sobreAcento: string; // texto sobre el acento
};

export type Negocio = {
  slug: string; // identificador único en la base compartida, sin espacios
  nombre: string;
  rubro: string;
  frase: string;
  presentacion: string;
  direccion: string;
  barrio: string;
  ciudad: string;
  pais: string;
  telefono: string; // como se muestra
  whatsapp?: string; // formato internacional sin "+" ni espacios: 59899123456
  instagram?: string; // usuario sin "@"
  email?: string; // de contacto, se muestra al público
  emailAvisos?: string; // donde el local recibe cada reserva nueva (no se muestra)
  zonaHoraria: string;
  moneda: string;
  turnos: {
    intervalo: number; // cada cuántos minutos se ofrece un turno
    diasAdelante: number; // hasta cuántos días se puede reservar
    anticipacionMinima: number; // minutos mínimos entre ahora y el turno
  };
  horarios: Horarios;
  servicios: Servicio[];
  profesionales: Profesional[];
  fotos: { portada: Foto; galeria: Foto[] };
  // Estilo visual: "verde", "noche" (barbería clásica) o "salon" (peluquería femenina).
  // Ver src/lib/estilos.ts. `tema` permite retocar colores sueltos del estilo.
  estilo: Estilo;
  tema?: Partial<Tema>;
  esDemo?: boolean; // armado desde la planilla de prospectos (ver demos/README.md)
};

export const negocio: Negocio = {
  slug: "peluqueria-ramirez",
  nombre: "Peluquería Ramírez",
  rubro: "Peluquería y barbería",
  frase: "Cortes y barba en La Blanqueada desde 1998.",
  presentacion:
    "Somos dos sillones, una radio y veinticinco años de clientes que vuelven. Cortamos clásico, moderno y a los más chicos. Elegí el horario acá y te esperamos.",
  direccion: "Av. 8 de Octubre 2890",
  barrio: "La Blanqueada",
  ciudad: "Montevideo",
  pais: "Uruguay",
  telefono: "099 123 456",
  whatsapp: "59899123456",
  instagram: "peluqueriaramirez.uy",
  zonaHoraria: "America/Montevideo",
  moneda: "$",
  emailAvisos: "musacconicolas@gmail.com",
  turnos: { intervalo: 15, diasAdelante: 21, anticipacionMinima: 0 },
  horarios: {
    2: [["10:00", "13:00"], ["14:30", "20:00"]],
    3: [["10:00", "13:00"], ["14:30", "20:00"]],
    4: [["10:00", "13:00"], ["14:30", "20:00"]],
    5: [["10:00", "20:00"]],
    6: [["09:00", "16:00"]],
  },
  servicios: [
    { id: "corte", nombre: "Corte de pelo", descripcion: "Clásico o moderno, con lavado.", duracion: 15, precio: 700 },
    { id: "infantil", nombre: "Corte infantil", descripcion: "Hasta 12 años, con paciencia.", duracion: 15, precio: 600 },
    { id: "corte-barba", nombre: "Corte y barba", descripcion: "Corte completo más perfilado de barba.", duracion: 60, precio: null, reservable: false },
    { id: "barba", nombre: "Recorte de barba", descripcion: "Perfilado con navaja y toalla caliente.", duracion: 30, precio: null, reservable: false },
    { id: "color", nombre: "Color y reflejos", descripcion: "Te pasamos presupuesto según el largo.", duracion: 90, precio: null, reservable: false },
  ],
  profesionales: [
    { id: "hector", nombre: "Héctor Ramírez", rol: "Fundador" },
    { id: "lucia", nombre: "Lucía Ramírez", rol: "Color y cortes", servicios: ["corte", "infantil", "color"] },
  ],
  fotos: {
    portada: {
      src: "https://images.unsplash.com/photo-1775494165568-42c0fbb4c782",
      alt: "Sillón de barbero antiguo junto a la puerta, con luz de la tarde",
    },
    galeria: [
      { src: "https://images.unsplash.com/photo-1759134198561-e2041049419c", alt: "Peluqueros cortando el pelo a dos clientes" },
      { src: "https://images.unsplash.com/photo-1773863683180-f96a39a4804a", alt: "Dos sillones rojos en un salón con paredes de madera" },
      { src: "https://images.unsplash.com/photo-1754294437661-129b86f868ea", alt: "Espejo de barbería con herramientas sobre la mesada" },
      { src: "https://images.unsplash.com/photo-1781455793310-8427c96454c7", alt: "Salón vacío con sillones y espejos antes de abrir" },
    ],
  },
  estilo: "verde",
  // Para retocar un color del estilo, por ejemplo: tema: { acento: "#B3261E", sobreAcento: "#FFFFFF" },
};
