import { redirect } from "next/navigation";
import { getPerfilActual, type PerfilActual } from "@/lib/perfil";
import { canAccess, canWrite, type Seccion } from "@/lib/roles";
import { createClient } from "@/lib/supabase/server";

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
  await registrarAuditoria(perfil, seccion);
  return perfil;
}

// Registro de Auditoría (2026-08-14): centralizado acá porque requireWrite()
// es el primer paso de prácticamente toda Server Action que crea/edita/borra
// algo en la app -- captura quién escribió en qué sección y cuándo sin tener
// que instrumentar cada acción por separado. Nunca debe tumbar la acción
// real del usuario si falla (ej. la migración 0097 aún no se aplicó), así
// que el error se traga y solo se deja constancia en el log del servidor.
async function registrarAuditoria(perfil: PerfilActual, seccion: Seccion): Promise<void> {
  try {
    const supabase = await createClient();
    await supabase.from("auditoria_acciones").insert({
      usuario_id: perfil.id,
      usuario_nombre: perfil.nombreCompleto,
      correo: perfil.email,
      seccion,
    });
  } catch (error) {
    console.error("No se pudo registrar la auditoría:", error);
  }
}
