"use client";

import { useEffect } from "react";
import { COOKIE_ESTILO, ESTILOS, esEstilo, type Estilo } from "@/lib/estilos";

/** Guarda el estilo elegido solo para esta demo (la cookie viaja únicamente a /demo/<slug>). */
function recordarEstilo(slug: string, estilo: Estilo) {
  document.cookie = `${COOKIE_ESTILO}=${estilo}; path=/demo/${slug}; max-age=${60 * 60 * 24 * 30}; samesite=lax`;
}

function estiloRecordado(): Estilo | undefined {
  const valor = document.cookie.match(new RegExp(`(?:^|; )${COOKIE_ESTILO}=([^;]*)`))?.[1];
  return esEstilo(valor) ? valor : undefined;
}

/** La misma URL sin ?estilo= (para que mande la cookie), conservando el resto (ej. ?dia=). */
function urlSinEstilo() {
  const url = new URL(window.location.href);
  url.searchParams.delete("estilo");
  return url.pathname + url.search + url.hash;
}

/**
 * Solo en las demos: cambia el estilo de la landing y del panel (mismas fotos y
 * datos). La elección se recuerda para esa demo, así el panel abre en el mismo
 * estilo. Usa sus propios colores neutros para no confundirse con el diseño del local.
 */
export function SelectorEstilo({ actual, slug }: { actual: Estilo; slug: string }) {
  // Si el navegador muestra una copia guardada de la página (ej. al volver con
  // "atrás") y el estilo elegido cambió mientras tanto, se recarga con el correcto.
  useEffect(() => {
    const revisar = () => {
      const recordado = estiloRecordado();
      const enUrl = new URL(window.location.href).searchParams.get("estilo");
      if (enUrl || !recordado || recordado === actual) return;
      // Freno: como mucho una recarga automática cada 10 segundos.
      try {
        const ultima = Number(sessionStorage.getItem("estilo-recarga") ?? 0);
        if (Date.now() - ultima < 10_000) return;
        sessionStorage.setItem("estilo-recarga", String(Date.now()));
      } catch {
        return;
      }
      window.location.reload();
    };
    revisar();
    window.addEventListener("pageshow", revisar);
    return () => window.removeEventListener("pageshow", revisar);
  }, [actual]);

  function elegir(estilo: Estilo) {
    recordarEstilo(slug, estilo);
    // Recarga completa: así no quedan pedidos viejos que pisen el estilo nuevo.
    window.location.replace(urlSinEstilo());
  }

  return (
    <nav
      aria-label="Estilo de la vista previa"
      className="fixed inset-x-0 bottom-3 z-50 mx-auto flex w-max max-w-[calc(100vw-1.5rem)] items-center gap-1 rounded-full bg-[#111]/90 p-1 pl-3 text-sm text-white shadow-lg backdrop-blur"
    >
      <span className="pr-1 text-white/70">Vista previa</span>
      {(Object.keys(ESTILOS) as Estilo[]).map((e) => (
        <button
          key={e}
          type="button"
          onClick={() => elegir(e)}
          aria-pressed={e === actual}
          className={`rounded-full px-3 py-1.5 ${e === actual ? "bg-white font-semibold text-[#111]" : "hover:bg-white/15"}`}
        >
          {ESTILOS[e].nombre}
        </button>
      ))}
    </nav>
  );
}
