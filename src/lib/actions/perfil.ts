"use server";

import { revalidatePath } from "next/cache";
import { requirePerfil } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { perfilUpdateSchema } from "@/lib/validation/perfil";
import type { ActionState } from "./types";

export async function actualizarPerfilAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const perfil = await requirePerfil();

  const parsed = perfilUpdateSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("perfiles")
    .update({
      nombre_completo: parsed.data.nombreCompleto,
      telefono: parsed.data.telefono || null,
    })
    .eq("id", perfil.id);

  if (error) return { error: "No se pudo actualizar tu perfil." };

  revalidatePath("/mi-perfil");
  return { error: null, success: true };
}
