"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireSection } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  usuarioCreateSchema,
  usuarioUpdateSchema,
  usuarioPasswordSchema,
} from "@/lib/validation/usuarios";
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

export async function actualizarUsuarioAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  // Igual que crearUsuarioAction: usa la service_role key para el correo,
  // asi que este chequeo de seccion ES el control de acceso real.
  await requireSection("usuarios");

  const parsed = usuarioUpdateSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }

  const supabase = await createClient();
  const { error: perfilError } = await supabase
    .from("perfiles")
    .update({
      nombre_completo: parsed.data.nombreCompleto,
      rol: parsed.data.rol,
    })
    .eq("id", parsed.data.id);

  if (perfilError) return { error: "No se pudo actualizar el usuario." };

  const admin = createAdminClient();
  const { error: emailError } = await admin.auth.admin.updateUserById(
    parsed.data.id,
    { email: parsed.data.email },
  );

  if (emailError) {
    const yaExiste = emailError.message?.toLowerCase().includes("already");
    return {
      error: yaExiste
        ? "Ya existe otro usuario con ese correo."
        : "El nombre y rol se guardaron, pero no se pudo actualizar el correo.",
    };
  }

  revalidatePath("/usuarios");
  redirect("/usuarios");
}

export async function asignarPasswordAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireSection("usuarios");

  const parsed = usuarioPasswordSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.updateUserById(parsed.data.id, {
    password: parsed.data.password,
  });

  if (error) return { error: "No se pudo asignar la contraseña." };

  return { error: null, success: true };
}

export async function eliminarUsuarioAction(id: string) {
  const perfilActual = await requireSection("usuarios");
  if (perfilActual.id === id) return; // no puedes eliminar tu propia cuenta

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.deleteUser(id); // perfiles se borra en cascada (FK)
  if (error) throw new Error("No se pudo eliminar el usuario.");
  revalidatePath("/usuarios");
}

export type UsuarioConEmail = {
  id: string;
  nombreCompleto: string;
  rol: "administrador" | "jefe" | "soporte";
  email: string;
  telefono: string | null;
  creadoEn: string;
};

export async function listarUsuarios(): Promise<UsuarioConEmail[]> {
  await requireSection("usuarios");

  const supabase = await createClient();
  const { data: perfiles } = await supabase
    .from("perfiles")
    .select("id, nombre_completo, rol, telefono, creado_en")
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
    telefono: perfil.telefono,
    creadoEn: perfil.creado_en,
  }));
}

export async function obtenerUsuario(id: string): Promise<UsuarioConEmail | null> {
  await requireSection("usuarios");

  const supabase = await createClient();
  const { data: perfil } = await supabase
    .from("perfiles")
    .select("id, nombre_completo, rol, telefono, creado_en")
    .eq("id", id)
    .maybeSingle();

  if (!perfil) return null;

  const admin = createAdminClient();
  const { data } = await admin.auth.admin.getUserById(id);

  return {
    id: perfil.id,
    nombreCompleto: perfil.nombre_completo,
    rol: perfil.rol,
    email: data.user?.email ?? "—",
    telefono: perfil.telefono,
    creadoEn: perfil.creado_en,
  };
}
