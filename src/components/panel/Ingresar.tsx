import { redirect } from "next/navigation";
import type { Negocio } from "@/negocio.config";
import { rutaBase, variablesTema } from "@/lib/formato";
import { sesionValida } from "@/lib/sesion";
import { FormularioPin } from "./FormularioPin";

export async function Ingresar({ negocio: n }: { negocio: Negocio }) {
  if (await sesionValida()) redirect(`${rutaBase(n)}/panel`);
  return (
    <main style={variablesTema(n.tema)} className="flex flex-1 items-center justify-center bg-hero px-4 py-16 text-sobre-hero">
      <div className="w-full max-w-xs">
        <h1 className="titular text-5xl [overflow-wrap:anywhere]">{n.nombre}</h1>
        <p className="mt-3 text-sobre-hero/75">Ingresá el PIN del local para ver la agenda.</p>
        <FormularioPin negocio={n.esDemo ? n.slug : ""} />
      </div>
    </main>
  );
}
