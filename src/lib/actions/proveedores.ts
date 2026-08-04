"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireWrite } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { proveedorSchema, proveedorEditSchema } from "@/lib/validation/proveedores";
import type { ActionState } from "./types";

export async function crearProveedorAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const perfil = await requireWrite("compras");
  const raw = Object.fromEntries(formData) as Record<string, string>;

  const parsed = proveedorSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos", values: raw };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("proveedores").insert({
    nombre: parsed.data.nombre,
    contacto: parsed.data.contacto || null,
    telefono: parsed.data.telefono || null,
    correo: parsed.data.correo || null,
    direccion: parsed.data.direccion || null,
    ruc: parsed.data.ruc || null,
    dv: parsed.data.dv || null,
    nota: parsed.data.nota || null,
    registrado_por: perfil.id,
  });

  if (error) return { error: "No se pudo guardar el proveedor. Intenta de nuevo.", values: raw };

  revalidatePath("/compras/proveedores");
  return { error: null, success: true };
}

export async function editarProveedorAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireWrite("compras");
  const raw = Object.fromEntries(formData) as Record<string, string>;

  const parsed = proveedorEditSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos", values: raw };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("proveedores")
    .update({
      nombre: parsed.data.nombre,
      contacto: parsed.data.contacto || null,
      telefono: parsed.data.telefono || null,
      correo: parsed.data.correo || null,
      direccion: parsed.data.direccion || null,
      ruc: parsed.data.ruc || null,
      dv: parsed.data.dv || null,
      nota: parsed.data.nota || null,
    })
    .eq("id", parsed.data.id);

  if (error) return { error: "No se pudo guardar el proveedor. Intenta de nuevo.", values: raw };

  revalidatePath("/compras/proveedores");
  redirect("/compras/proveedores");
}

export async function eliminarProveedorAction(id: string) {
  await requireWrite("compras");
  const supabase = await createClient();
  const { error } = await supabase.from("proveedores").delete().eq("id", id);
  if (error) throw new Error("No se pudo eliminar el proveedor.");
  revalidatePath("/compras/proveedores");
}
