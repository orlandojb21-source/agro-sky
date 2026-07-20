"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireSection } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { usuarioCreateSchema, usuarioRolSchema } from "@/lib/validation/usuarios";
import type { ActionState } from "./types";

export async function crearUsuarioAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  // Defensa en profundidad: esta accion usa la service_role key, que se
  // salta RLS, asi que el chequeo de rol de aqui ES el control de acceso real.
  await requireSection("usuarios");

  const parsed = usuarioCreateSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }

  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.createUser({
    email: parsed.data.email,
    password: parsed.data.password,
    email_confirm: true,
  });

  if (error || !data.user) {
    const yaExiste = error?.message?.toLowerCase().includes("already");
    return {
      error: yaExiste
        ? "Ya existe un usuario con ese correo."
        : "No se pudo crear el usuario. Intenta de nuevo.",
    };
  }

  const { error: perfilError } = await admin.from("perfiles").insert({
    id: data.user.id,
    nombre_completo: parsed.data.nombreCompleto,
    rol: parsed.data.rol,
  });

  if (perfilError) {
    await admin.auth.admin.deleteUser(data.user.id);
    return { error: "No se pudo crear el perfil del usuario." };
  }

  revalidatePath("/usuarios");
  redirect("/usuarios");
}

export async function actualizarRolAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireSection("usuarios");

  const parsed = usuarioRolSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("perfiles")
    .update({ rol: parsed.data.rol })
    .eq("id", parsed.data.id);

  if (error) return { error: "No se pudo actualizar el rol." };

  revalidatePath("/usuarios");
  return { error: null };
}

export async function eliminarUsuarioAction(id: string) {
  const perfilActual = await requireSection("usuarios");
  if (perfilActual.id === id) return; // no puedes eliminar tu propia cuenta

  const admin = createAdminClient();
  await admin.auth.admin.deleteUser(id); // perfiles se borra en cascada (FK)
  revalidatePath("/usuarios");
}

export type UsuarioConEmail = {
  id: string;
  nombreCompleto: string;
  rol: "administrador" | "jefe" | "soporte";
  email: string;
  creadoEn: string;
};

export async function listarUsuarios(): Promise<UsuarioConEmail[]> {
  await requireSection("usuarios");

  const supabase = await createClient();
  const { data: perfiles } = await supabase
    .from("perfiles")
    .select("id, nombre_completo, rol, creado_en")
    .order("creado_en");

  if (!perfiles || perfiles.length === 0) return [];

  const admin = createAdminClient();
  const correos = new Map<string, string>();
  await Promise.all(
    perfiles.map(async (perfil) => {
      const { data } = await admin.auth.admin.getUserById(perfil.id);
      correos.set(perfil.id, data.user?.email ?? "—");
    }),
  );

  return perfiles.map((perfil) => ({
    id: perfil.id,
    nombreCompleto: perfil.nombre_completo,
    rol: perfil.rol,
    email: correos.get(perfil.id) ?? "—",
    creadoEn: perfil.creado_en,
  }));
}
