import { redirect } from "next/navigation";
import { requirePerfil } from "@/lib/session";

// El rol "campo" pasa el gate de la sección "informes" pero Proyectos
// (crear/editar/eliminar) queda solo para oficina (pedido explícito del
// usuario, 2026-08-14) -- mismo patrón que informes/diario/layout.tsx.
// Campo sigue viendo la lista de Proyectos ya creados desde el <select>
// del formulario de Informe de Campo, no desde esta pantalla.
export default async function ProyectosLayout({ children }: { children: React.ReactNode }) {
  const perfil = await requirePerfil();
  if (perfil.rol === "campo") {
    redirect("/informes/campo");
  }

  return children;
}
