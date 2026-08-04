import { redirect } from "next/navigation";
import { getPerfilActual, type PerfilActual } from "@/lib/perfil";
import { canAccess, canWrite, type Seccion } from "@/lib/roles";

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

// Para toda página o Server Action que CREA/EDITA/BORRA algo (no solo lee)
// -- roles de solo lectura (ej. "gerente") pasan requireSection() pero no
// esto. Mismo mecanismo de redirect() que requireSection, así que
// funciona igual dentro de un <form action={...}> o un DeleteButton
// (ver src/components/ui/DeleteButton.tsx) que dentro de una página.
export async function requireWrite(seccion: Seccion): Promise<PerfilActual> {
  const perfil = await requireSection(seccion);
  if (!canWrite(perfil.rol, seccion)) {
    redirect("/unauthorized");
  }
  return perfil;
}
