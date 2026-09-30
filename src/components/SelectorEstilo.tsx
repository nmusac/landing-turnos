"use client";

import { useRouter } from "next/navigation";
import { COOKIE_ESTILO, ESTILOS, type Estilo } from "@/lib/estilos";

/** Guarda el estilo elegido solo para esta demo (la cookie viaja únicamente a /demo/<slug>). */
function recordarEstilo(slug: string, estilo: Estilo) {
  document.cookie = `${COOKIE_ESTILO}=${estilo}; path=/demo/${slug}; max-age=${60 * 60 * 24 * 30}; samesite=lax`;
}

/**
 * Solo en las demos: cambia el estilo de la landing y del panel (mismas fotos y
 * datos). La elección se recuerda para esa demo, así el panel abre en el mismo
 * estilo. Usa sus propios colores neutros para no confundirse con el diseño del local.
 */
export function SelectorEstilo({ actual, slug }: { actual: Estilo; slug: string }) {
  const router = useRouter();

  function elegir(estilo: Estilo) {
    recordarEstilo(slug, estilo);
    // Sin ?estilo= en la URL, para que mande la cookie; se conservan los demás parámetros (ej. ?dia=).
    const url = new URL(window.location.href);
    url.searchParams.delete("estilo");
    router.replace(url.pathname + url.search, { scroll: false });
    router.refresh();
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
