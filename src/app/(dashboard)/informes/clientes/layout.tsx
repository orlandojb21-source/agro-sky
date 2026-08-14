import { redirect } from "next/navigation";
import { requirePerfil } from "@/lib/session";

// El rol "campo" pasa el gate de la sección "informes" pero Clientes
// queda solo para oficina (pedido explícito del usuario, 2026-08-14) --
// mismo patrón que informes/diario/layout.tsx.
export default async function ClientesLayout({ children }: { children: React.ReactNode }) {
  const perfil = await requirePerfil();
  if (perfil.rol === "campo") {
    redirect("/informes/campo");
  }

  return children;
}
