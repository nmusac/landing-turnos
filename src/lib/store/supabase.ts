import { createClient } from "@supabase/supabase-js";
import { HorarioOcupado, type Bloqueo, type Reserva, type Store } from "./tipos";

// Las tablas tienen RLS activado y sin políticas: solo el servidor, con la
// clave secreta, puede leer o escribir. El navegador nunca habla con Supabase.

type FilaReserva = {
  id: string;
  profesional_id: string;
  servicio_id: string;
  inicio: string;
  fin: string;
  cliente_nombre: string;
  cliente_telefono: string | null;
  cliente_email: string | null;
  nota: string | null;
  origen: Reserva["origen"];
  estado: Reserva["estado"];
  creada: string;
};

type FilaBloqueo = { id: string; profesional_id: string | null; inicio: string; fin: string; motivo: string | null };

const aReserva = (f: FilaReserva): Reserva => ({
  id: f.id,
  profesionalId: f.profesional_id,
  servicioId: f.servicio_id,
  inicio: f.inicio,
  fin: f.fin,
  nombre: f.cliente_nombre,
  telefono: f.cliente_telefono,
  email: f.cliente_email,
  nota: f.nota,
  origen: f.origen,
  estado: f.estado,
  creada: f.creada,
});

const aBloqueo = (f: FilaBloqueo): Bloqueo => ({
  id: f.id,
  profesionalId: f.profesional_id,
  inicio: f.inicio,
  fin: f.fin,
  motivo: f.motivo,
});

// Código de Postgres para violación de la restricción EXCLUDE (doble reserva).
const EXCLUSION_VIOLATION = "23P01";

export function storeSupabase(slug: string, url: string, clave: string): Store {
  const db = createClient(url, clave, { auth: { persistSession: false } });

  return {
    async ocupacionesEntre(desde, hasta) {
      const [reservas, bloqueos] = await Promise.all([
        db
          .from("reservas")
          .select("*")
          .eq("negocio", slug)
          .eq("estado", "confirmada")
          .lt("inicio", hasta.toISOString())
          .gt("fin", desde.toISOString())
          .order("inicio"),
        db
          .from("bloqueos")
          .select("*")
          .eq("negocio", slug)
          .lt("inicio", hasta.toISOString())
          .gt("fin", desde.toISOString())
          .order("inicio"),
      ]);
      if (reservas.error) throw reservas.error;
      if (bloqueos.error) throw bloqueos.error;
      return {
        reservas: (reservas.data as FilaReserva[]).map(aReserva),
        bloqueos: (bloqueos.data as FilaBloqueo[]).map(aBloqueo),
      };
    },
    async crearReserva(r) {
      const { data, error } = await db
        .from("reservas")
        .insert({
          negocio: slug,
          profesional_id: r.profesionalId,
          servicio_id: r.servicioId,
          inicio: r.inicio,
          fin: r.fin,
          cliente_nombre: r.nombre,
          cliente_telefono: r.telefono,
          cliente_email: r.email,
          nota: r.nota,
          origen: r.origen,
        })
        .select()
        .single();
      if (error?.code === EXCLUSION_VIOLATION) throw new HorarioOcupado();
      if (error) throw error;
      return aReserva(data as FilaReserva);
    },
    async cancelarReserva(id) {
      const { data, error } = await db
        .from("reservas")
        .update({ estado: "cancelada" })
        .eq("negocio", slug)
        .eq("id", id)
        .eq("estado", "confirmada")
        .select()
        .maybeSingle();
      if (error) throw error;
      return data ? aReserva(data as FilaReserva) : null;
    },
    async crearBloqueo(b) {
      const { data, error } = await db
        .from("bloqueos")
        .insert({ negocio: slug, profesional_id: b.profesionalId, inicio: b.inicio, fin: b.fin, motivo: b.motivo })
        .select()
        .single();
      if (error) throw error;
      return aBloqueo(data as FilaBloqueo);
    },
    async borrarBloqueo(id) {
      const { error } = await db.from("bloqueos").delete().eq("negocio", slug).eq("id", id);
      if (error) throw error;
    },
  };
}
