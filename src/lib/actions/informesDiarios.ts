"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireWrite } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { informeDiarioSchema, informeDiarioEditSchema } from "@/lib/validation/informesDiarios";
import type { ActionState } from "./types";

function mensajeError(error: { code?: string }): string {
  // El unique en informe_campo_id (migración 0052) salta si ese Informe de
  // Campo ya tiene un Informe Diario -- puede pasar si 2 personas lo
  // intentan a la vez, o si la lista mostrada quedó desactualizada.
  if (error.code === "23505") {
    return "Ese Informe de Campo ya tiene un Informe Diario. Actualiza la página e intenta de nuevo.";
  }
  return "No se pudo guardar el informe diario. Intenta de nuevo.";
}

export async function crearInformeDiarioAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const perfil = await requireWrite("informes");
  const raw = Object.fromEntries(formData) as Record<string, string>;

  const parsed = informeDiarioSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos", values: raw };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("informes_diarios").insert({
    informe_campo_id: parsed.data.informeCampoId,
    cliente: parsed.data.cliente,
    fecha: parsed.data.fecha,
    hectareas_aplicadas: parsed.data.hectareasAplicadas,
    tipo_aplicacion: parsed.data.tipoAplicacion,
    dosis: parsed.data.dosis,
    boquillas: parsed.data.boquillas,
    altura_vuelo: parsed.data.alturaVuelo,
    ancho_pases: parsed.data.anchoPases,
    velocidad: parsed.data.velocidad,
    nota: parsed.data.nota || null,
    registrado_por: perfil.id,
  });

  if (error) return { error: mensajeError(error), values: raw };

  revalidatePath("/informes/diario");
  redirect("/informes/diario");
}

export async function editarInformeDiarioAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireWrite("informes");
  const raw = Object.fromEntries(formData) as Record<string, string>;

  const parsed = informeDiarioEditSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos", values: raw };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("informes_diarios")
    .update({
      informe_campo_id: parsed.data.informeCampoId,
      cliente: parsed.data.cliente,
      fecha: parsed.data.fecha,
      hectareas_aplicadas: parsed.data.hectareasAplicadas,
      tipo_aplicacion: parsed.data.tipoAplicacion,
      dosis: parsed.data.dosis,
      boquillas: parsed.data.boquillas,
      altura_vuelo: parsed.data.alturaVuelo,
      ancho_pases: parsed.data.anchoPases,
      velocidad: parsed.data.velocidad,
      nota: parsed.data.nota || null,
    })
    .eq("id", parsed.data.id);

  if (error) return { error: mensajeError(error), values: raw };

  revalidatePath("/informes/diario");
  revalidatePath(`/informes/diario/${parsed.data.id}`);
  redirect(`/informes/diario/${parsed.data.id}`);
}

export async function eliminarInformeDiarioAction(id: string) {
  await requireWrite("informes");
  const supabase = await createClient();

  const { error } = await supabase.from("informes_diarios").delete().eq("id", id);
  if (error) throw new Error("No se pudo eliminar el informe diario.");

  revalidatePath("/informes/diario");
}
