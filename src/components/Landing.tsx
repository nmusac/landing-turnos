import Image, { type ImageProps } from "next/image";
import type { Negocio } from "@/negocio.config";
import { duracion, horariosAgrupados, linkWhatsapp, precio, rutaBase, variablesTema } from "@/lib/formato";
import { ReservaProvider } from "@/components/reserva/Contexto";
import { ProximosTurnos } from "@/components/reserva/ProximosTurnos";
import { Reservar } from "@/components/reserva/Reservar";
import { BotonServicio } from "@/components/reserva/BotonServicio";

const DIAS_LD = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

// Hosts que next/image puede optimizar (ver next.config.ts); el resto se muestra tal cual.
const optimizable = (src: string) => /^https:\/\/(images\.unsplash\.com|[\w-]+\.googleusercontent\.com)\//.test(src);

function Foto(props: ImageProps & { src: string }) {
  return <Image {...props} alt={props.alt} unoptimized={!optimizable(props.src)} />;
}

/** Para servicios que no se reservan online: WhatsApp con el mensaje escrito, o llamar. */
function Consultar({ negocio: n, servicio }: { negocio: Negocio; servicio: string }) {
  const href = n.whatsapp
    ? linkWhatsapp(n.whatsapp, `Hola, quería consultar por ${servicio}.`)
    : n.telefono
      ? `tel:${n.telefono.replace(/\s/g, "")}`
      : null;
  if (!href) return null;
  return (
    <a
      href={href}
      {...(n.whatsapp && { target: "_blank", rel: "noreferrer" })}
      className="shrink-0 text-sm font-semibold underline underline-offset-4 hover:text-suave"
      aria-label={`Consultar por ${servicio}${n.whatsapp ? " por WhatsApp" : " por teléfono"}`}
    >
      {n.whatsapp ? "Escribinos" : "Llamanos"}
    </a>
  );
}

// Anchos de la galería según cuántas fotos haya (hasta 4).
const COLUMNAS = ["", "md:grid-cols-1", "md:grid-cols-[2fr_1fr]", "md:grid-cols-[2fr_1fr_1.5fr]", "md:grid-cols-[2fr_1fr_1fr_1.5fr]"];

const contenedor = "mx-auto w-full max-w-6xl px-4 sm:px-8";

export function Landing({ negocio }: { negocio: Negocio }) {
  const equipo = negocio.profesionales.length > 1;
  const direccionCompleta = [negocio.direccion, negocio.ciudad, negocio.pais].filter(Boolean).join(", ");
  const mapa = `https://www.google.com/maps?q=${encodeURIComponent(
    negocio.direccion ? direccionCompleta : `${negocio.nombre}, ${direccionCompleta}`,
  )}`;
  const galeria = negocio.fotos.galeria.slice(0, 4);

  // Datos estructurados para que Google muestre horarios y dirección.
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "HairSalon",
    name: negocio.nombre,
    description: negocio.frase,
    image: negocio.fotos.portada.src,
    telephone: negocio.telefono || undefined,
    address: {
      "@type": "PostalAddress",
      streetAddress: negocio.direccion,
      addressLocality: negocio.ciudad,
      addressCountry: negocio.pais,
    },
    openingHoursSpecification: Object.entries(negocio.horarios).flatMap(([dia, franjas]) =>
      franjas.map(([opens, closes]) => ({ "@type": "OpeningHoursSpecification", dayOfWeek: DIAS_LD[+dia], opens, closes })),
    ),
    ...(negocio.instagram && { sameAs: [`https://instagram.com/${negocio.instagram}`] }),
  };

  return (
    <ReservaProvider negocio={negocio}>
      <div data-estilo={negocio.estilo} style={variablesTema(negocio)} className="flex flex-1 flex-col bg-fondo text-texto">
        {!negocio.esDemo && (
          <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
        )}

        <header className="bg-hero text-sobre-hero">
          <nav className={`${contenedor} flex items-center justify-between gap-4 py-4`}>
            <span className="subtitulo text-xl">{negocio.nombre}</span>
            <a href="#reservar" className="shrink-0 rounded-(--radio-boton) bg-acento text-sobre-acento px-4 py-2 text-sm font-semibold">
              Reservar turno
            </a>
          </nav>

          <div className={`${contenedor} grid gap-10 pb-12 pt-8 md:grid-cols-[1.15fr_1fr] md:items-end md:pb-20 md:pt-14`}>
            <div>
              <p className="text-sobre-hero/75">
                {negocio.rubro}
                {negocio.barrio && <> en {negocio.barrio}</>}
              </p>
              <h1 className="titular mt-3 [--t:clamp(3.5rem,11vw,9.5rem)] [overflow-wrap:anywhere]">{negocio.nombre}</h1>
              <p className="mt-6 max-w-md text-lg text-sobre-hero/85">{negocio.frase}</p>
              {negocio.direccion && (
                <p className="mt-2 text-sobre-hero/70">
                  <a href={mapa} target="_blank" rel="noreferrer" className="underline underline-offset-4 decoration-sobre-hero/40">
                    {negocio.direccion}
                  </a>
                </p>
              )}
            </div>

            <div className="relative">
              <div className="relative aspect-[4/3] md:aspect-[4/5] overflow-hidden rounded-(--radio-caja)">
                <Foto
                  src={negocio.fotos.portada.src}
                  alt={negocio.fotos.portada.alt}
                  fill
                  priority
                  sizes="(min-width: 768px) 45vw, 100vw"
                  className="object-cover"
                />
              </div>
              <div className="relative -mt-24 mx-3 sm:mx-6 md:absolute md:inset-x-4 md:bottom-8 md:mt-0 md:mx-0 lg:-left-12 lg:right-auto lg:w-[22rem]">
                <ProximosTurnos />
              </div>
            </div>
          </div>
        </header>

        <main>
          <section className={`${contenedor} grid gap-10 py-16 md:grid-cols-[1fr_1.4fr] md:py-24`} aria-labelledby="servicios">
            <div>
              <h2 id="servicios" className="titular [--t:3.75rem] sm:[--t:4.5rem]">
                Servicios y precios
              </h2>
              <p className="mt-5 max-w-sm text-suave text-lg leading-relaxed">{negocio.presentacion}</p>
            </div>
            <ul className="divide-y divide-linea border-y border-linea">
              {negocio.servicios.map((s) => (
                <li key={s.id} className="py-4">
                  <div className="flex items-baseline gap-3">
                    <span className="text-lg font-semibold">{s.nombre}</span>
                    <span className="guia" aria-hidden />
                    <span className="text-lg font-semibold tabular-nums">{precio(negocio.moneda, s.precio)}</span>
                  </div>
                  <div className="mt-1 flex items-baseline justify-between gap-4 text-sm text-suave">
                    {s.reservable === false ? (
                      <>
                        <span>{s.descripcion}</span>
                        <Consultar negocio={negocio} servicio={s.nombre} />
                      </>
                    ) : (
                      <>
                        <span>
                          {s.descripcion} {duracion(s.duracion)}.
                        </span>
                        <BotonServicio servicio={s.id} nombre={s.nombre} />
                      </>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </section>

          {galeria.length > 0 && (
            <section aria-label="Fotos del local" className="overflow-x-auto">
              <div className={`flex gap-2 px-4 sm:px-8 snap-x md:grid md:px-0 ${COLUMNAS[galeria.length]}`}>
                {galeria.map((f) => (
                  <div key={f.src} className="relative h-72 w-[75vw] shrink-0 snap-center overflow-hidden md:h-96 md:w-auto rounded-(--radio-caja)">
                    <Foto src={f.src} alt={f.alt} fill sizes="(min-width: 768px) 30vw, 75vw" className="object-cover" />
                  </div>
                ))}
              </div>
            </section>
          )}

          {equipo && (
            <section className={`${contenedor} pt-16 md:pt-24`} aria-labelledby="equipo">
              <h2 id="equipo" className="titular [--t:3rem] sm:[--t:3.75rem]">
                Quién te atiende
              </h2>
              <ul className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {negocio.profesionales.map((p) => (
                  <li key={p.id} className="border-t-4 border-texto pt-3">
                    <p className="subtitulo text-3xl">{p.nombre}</p>
                    {p.rol && <p className="mt-1 text-suave">{p.rol}</p>}
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section id="reservar" className={`${contenedor} scroll-mt-4 py-16 md:py-24`} aria-labelledby="titulo-reservar">
            <div className="grid gap-10 md:grid-cols-[minmax(0,1fr)_minmax(0,1.9fr)]">
              <div>
                <h2 id="titulo-reservar" className="titular [--t:3.75rem] sm:[--t:4.5rem]">
                  Reservá tu turno
                </h2>
                <p className="mt-5 max-w-xs text-suave text-lg">
                  Elegí el servicio, el día y la hora. Te confirmamos en el momento, sin llamar.
                </p>
              </div>
              <Reservar />
            </div>
          </section>

          <section className="bg-hero text-sobre-hero" aria-labelledby="donde">
            <div className={`${contenedor} grid gap-10 py-16 md:grid-cols-2 md:py-24`}>
              <div>
                <h2 id="donde" className="titular [--t:3.75rem] sm:[--t:4.5rem]">
                  Dónde estamos
                </h2>
                {negocio.direccion && <p className="mt-6 text-xl">{negocio.direccion}</p>}
                <p className={negocio.direccion ? "text-sobre-hero/75" : "mt-6 text-xl"}>
                  {[negocio.barrio, negocio.ciudad].filter(Boolean).join(", ")}
                </p>

                <dl className="mt-8 grid grid-cols-[auto_1fr] gap-x-6 gap-y-2">
                  {horariosAgrupados(negocio.horarios).map((h) => (
                    <div key={h.dias} className="contents">
                      <dt className="font-semibold">{h.dias}</dt>
                      <dd className={h.horario === "Cerrado" ? "text-sobre-hero/60" : "tabular-nums"}>{h.horario}</dd>
                    </div>
                  ))}
                </dl>

                <div className="mt-8 flex flex-wrap gap-3">
                  {negocio.whatsapp && (
                    <a href={linkWhatsapp(negocio.whatsapp)} target="_blank" rel="noreferrer" className="rounded-(--radio-boton) bg-acento text-sobre-acento px-4 py-2.5 font-semibold">
                      WhatsApp
                    </a>
                  )}
                  {negocio.telefono && (
                    <a href={`tel:${negocio.telefono.replace(/\s/g, "")}`} className="rounded-(--radio-boton) border border-sobre-hero/50 px-4 py-2.5 font-semibold">
                      Llamar al {negocio.telefono}
                    </a>
                  )}
                  {negocio.instagram && (
                    <a href={`https://instagram.com/${negocio.instagram}`} target="_blank" rel="noreferrer" className="rounded-(--radio-boton) border border-sobre-hero/50 px-4 py-2.5 font-semibold">
                      @{negocio.instagram}
                    </a>
                  )}
                </div>
              </div>
              <iframe
                title={`Mapa: ${direccionCompleta}`}
                src={`${mapa}&output=embed`}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                className="rounded-(--radio-caja) h-80 w-full border-0 md:h-full md:min-h-96 grayscale-[0.4]"
              />
            </div>
          </section>
        </main>

        <footer className={`${contenedor} flex flex-wrap justify-between gap-2 py-8 text-sm text-suave`}>
          <span>{[negocio.nombre, negocio.ciudad].filter(Boolean).join(", ")}</span>
          <a href={`${rutaBase(negocio)}/panel`} className="hover:underline">
            Acceso del local
          </a>
        </footer>
      </div>
    </ReservaProvider>
  );
}
