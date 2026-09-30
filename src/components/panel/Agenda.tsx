import Link from "next/link";
import type { Negocio } from "@/negocio.config";
import { desbloquear, salir } from "@/app/panel/acciones";
import { inicioDelDia, ocupacionesEntreFechas } from "@/lib/agenda";
import { buscarServicio, hoyLocal } from "@/lib/disponibilidad";
import { aWhatsapp, linkWhatsapp, rutaBase, variablesTema } from "@/lib/formato";
import { seSuperponen } from "@/lib/store";
import { esFecha, fechaCorta, fechaLarga, fechaLocal, horaLocal, sumarDias } from "@/lib/tiempo";
import { AgregarAgenda } from "./AgregarAgenda";
import { BotonCancelar } from "./BotonCancelar";

/** Agenda del local: tira de días, turnos y bloqueos del día elegido, y alta manual. */
export async function Agenda({ negocio: n, diaPedido }: { negocio: Negocio; diaPedido: unknown }) {
  const zona = n.zonaHoraria;
  const panel = `${rutaBase(n)}/panel`;
  const slug = n.esDemo ? n.slug : "";
  const hoy = hoyLocal(n);
  const dia = esFecha(diaPedido) ? diaPedido : hoy;
  const ultimo = sumarDias(hoy, n.turnos.diasAdelante);
  const tira = Array.from({ length: n.turnos.diasAdelante + 1 }, (_, i) => sumarDias(hoy, i));

  // Una sola lectura que cubre la tira de días y el día elegido (aunque sea pasado).
  const { reservas, bloqueos } = await ocupacionesEntreFechas(n, dia < hoy ? dia : hoy, dia > ultimo ? dia : ultimo);
  const fechaDe = (iso: string) => fechaLocal(new Date(iso), zona);
  const porDia = (f: string) => reservas.filter((r) => fechaDe(r.inicio) === f).length;
  const delDia = reservas.filter((r) => fechaDe(r.inicio) === dia);
  const bloqueosDelDia = bloqueos.filter((b) => seSuperponen(b, inicioDelDia(n, dia), inicioDelDia(n, sumarDias(dia, 1))));

  const muestraProfesional = n.profesionales.length > 1;
  const nombreProfesional = (id: string | null) =>
    id ? (n.profesionales.find((p) => p.id === id)?.nombre ?? id) : "Todo el local";

  return (
    <main style={variablesTema(n.tema)} className="flex-1 bg-fondo text-texto">
      <div className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-8">
        <header className="flex items-center justify-between gap-4">
          <h1 className="subtitulo text-2xl">{n.nombre}</h1>
          <form action={salir}>
            <input type="hidden" name="negocio" value={slug} />
            <button className="text-sm underline underline-offset-4">Salir</button>
          </form>
        </header>

        <nav aria-label="Próximos días" className="mt-6 -mx-1 flex gap-2 overflow-x-auto px-1 pb-2">
          {tira.map((f) => (
            <Link
              key={f}
              href={`${panel}?dia=${f}`}
              aria-current={f === dia ? "date" : undefined}
              className={`shrink-0 min-w-[4.75rem] border px-3 py-2 text-center ${f === dia ? "border-texto bg-texto text-superficie" : "border-linea bg-superficie"}`}
            >
              <span className="block text-sm first-letter:uppercase">{fechaCorta(f, hoy)}</span>
              <span className="block text-xs opacity-70">{porDia(f) === 1 ? "1 turno" : `${porDia(f)} turnos`}</span>
            </Link>
          ))}
        </nav>

        <div className="mt-8 flex flex-wrap items-end justify-between gap-4">
          <h2 className="titular text-5xl first-letter:uppercase">{fechaLarga(dia)}</h2>
          <div className="flex items-center gap-3 text-sm">
            <Link href={`${panel}?dia=${sumarDias(dia, -1)}`} className="border border-linea bg-superficie px-3 py-2" aria-label="Día anterior">
              ←
            </Link>
            <Link href={`${panel}?dia=${sumarDias(dia, 1)}`} className="border border-linea bg-superficie px-3 py-2" aria-label="Día siguiente">
              →
            </Link>
            <form action={panel} className="flex items-center gap-2">
              <label className="sr-only" htmlFor="ir-a-fecha">
                Ir a fecha
              </label>
              <input id="ir-a-fecha" type="date" name="dia" defaultValue={dia} required className="border border-linea bg-superficie px-2 py-1.5" />
              <button className="underline underline-offset-4">Ir</button>
            </form>
          </div>
        </div>

        {bloqueosDelDia.length > 0 && (
          <ul className="mt-4 grid gap-2">
            {bloqueosDelDia.map((b) => (
              <li key={b.id} className="flex items-center justify-between gap-3 border-l-4 border-acento bg-superficie px-3 py-2 text-sm">
                <span>
                  {new Date(b.inicio) <= inicioDelDia(n, dia) && new Date(b.fin) >= inicioDelDia(n, sumarDias(dia, 1))
                    ? "Bloqueado todo el día"
                    : `Bloqueado de ${horaLocal(new Date(b.inicio), zona)} a ${horaLocal(new Date(b.fin), zona)}`}
                  {muestraProfesional && <>, {nombreProfesional(b.profesionalId)}</>}
                  {b.motivo && <> ({b.motivo})</>}
                </span>
                <form action={desbloquear}>
                  <input type="hidden" name="negocio" value={slug} />
                  <input type="hidden" name="id" value={b.id} />
                  <button className="underline underline-offset-4">Quitar</button>
                </form>
              </li>
            ))}
          </ul>
        )}

        {delDia.length === 0 ? (
          <p className="mt-6 text-suave">No hay turnos este día.</p>
        ) : (
          <ol className="mt-6 divide-y divide-linea border-y border-linea">
            {delDia.map((r) => (
              <li key={r.id} className="grid grid-cols-[4rem_minmax(0,1fr)_auto] gap-x-3 py-4">
                <span className="subtitulo text-2xl tabular-nums">{horaLocal(new Date(r.inicio), zona)}</span>
                <div>
                  <p className="font-semibold">
                    {r.nombre}
                    {r.origen === "local" && <span className="ml-2 text-xs font-normal text-suave">cargado por el local</span>}
                  </p>
                  <p className="text-sm text-suave">
                    {buscarServicio(n, r.servicioId)?.nombre ?? r.servicioId}
                    {muestraProfesional && <>, con {nombreProfesional(r.profesionalId)}</>}
                  </p>
                  <p className="mt-1 flex flex-wrap gap-x-4 text-sm">
                    {r.telefono && (
                      <a href={linkWhatsapp(aWhatsapp(r.telefono))} target="_blank" rel="noreferrer" className="underline underline-offset-4">
                        {r.telefono}
                      </a>
                    )}
                    {r.email && (
                      <a href={`mailto:${r.email}`} className="underline underline-offset-4 [overflow-wrap:anywhere]">
                        {r.email}
                      </a>
                    )}
                  </p>
                  {r.nota && <p className="mt-1 text-sm italic">“{r.nota}”</p>}
                </div>
                <BotonCancelar
                  id={r.id}
                  negocio={slug}
                  descripcion={`${r.nombre} a las ${horaLocal(new Date(r.inicio), zona)}`}
                  avisa={!!r.email}
                />
              </li>
            ))}
          </ol>
        )}

        <AgregarAgenda negocio={n} dia={dia < hoy ? hoy : dia} hoy={hoy} />
      </div>
    </main>
  );
}
