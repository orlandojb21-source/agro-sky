import { redirect } from "next/navigation";
import { requirePerfil } from "@/lib/session";

// El rol "campo" pasa el gate de la sección "informes" (informes/layout.tsx)
// pero solo debe poder usar Informe de Campo -- ver la nota en
// SECTION_ACCESS (src/lib/roles.ts). Si llega aquí por URL directa
// (marcador viejo, escrito a mano), se le manda a la única pestaña que sí
// puede usar en vez de mostrarle un error.
export default async function InformeProyectoLayout({ children }: { children: React.ReactNode }) {
  const perfil = await requirePerfil();
  if (perfil.rol === "campo") {
    redirect("/informes/campo");
  }

  return children;
}
