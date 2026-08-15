"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requirePerfil } from "@/lib/session";
import { esAuditor } from "@/lib/auditoria";
import { createClient } from "@/lib/supabase/server";

async function requireAuditor() {
  const perfil = await requirePerfil();
  if (!esAuditor(perfil.email)) redirect("/unauthorized");
  return perfil;
}

export async function eliminarEventoAuditoriaAction(id: string) {
  await requireAuditor();
  const supabase = await createClient();
  const { error } = await supabase.from("auditoria_acciones").delete().eq("id", id);
  if (error) throw new Error("No se pudo eliminar el evento de auditoría.");
  revalidatePath("/auditoria");
}

export async function eliminarEventosAuditoriaAction(formData: FormData) {
  await requireAuditor();
  const ids = formData.getAll("id").map(String).filter(Boolean);
  if (ids.length === 0) return;

  const supabase = await createClient();
  const { error } = await supabase.from("auditoria_acciones").delete().in("id", ids);
  if (error) throw new Error("No se pudieron eliminar los eventos de auditoría seleccionados.");
  revalidatePath("/auditoria");
}
