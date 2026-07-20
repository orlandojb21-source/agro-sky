import { redirect } from "next/navigation";
import { getPerfilActual, type PerfilActual } from "@/lib/perfil";
import { canAccess, type Seccion } from "@/lib/roles";

export async function requirePerfil(): Promise<PerfilActual> {
  const perfil = await getPerfilActual();
  if (!perfil) redirect("/login");
  return perfil;
}

export async function requireSection(seccion: Seccion): Promise<PerfilActual> {
  const perfil = await requirePerfil();
  if (!canAccess(perfil.rol, seccion)) {
    redirect("/unauthorized");
  }
  return perfil;
}
