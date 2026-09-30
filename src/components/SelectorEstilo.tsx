import { ESTILOS, type Estilo } from "@/lib/estilos";

/**
 * Solo en las demos: cambia el estilo de la misma página (mismas fotos y datos).
 * Usa sus propios colores neutros para no confundirse con el diseño del local.
 */
export function SelectorEstilo({ actual }: { actual: Estilo }) {
  return (
    <nav
      aria-label="Estilo de la vista previa"
      className="fixed inset-x-0 bottom-3 z-50 mx-auto flex w-max max-w-[calc(100vw-1.5rem)] items-center gap-1 rounded-full bg-[#111]/90 p-1 pl-3 text-sm text-white shadow-lg backdrop-blur"
    >
      <span className="pr-1 text-white/70">Vista previa</span>
      {(Object.keys(ESTILOS) as Estilo[]).map((e) => (
        <a
          key={e}
          href={`?estilo=${e}`}
          aria-current={e === actual ? "page" : undefined}
          className={`rounded-full px-3 py-1.5 ${e === actual ? "bg-white font-semibold text-[#111]" : "hover:bg-white/15"}`}
        >
          {ESTILOS[e].nombre}
        </a>
      ))}
    </nav>
  );
}
