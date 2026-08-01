"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requirePerfil } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { informeDiarioSchema, informeDiarioEditSchema } from "@/lib/validation/informesDiarios";
import { eliminarImagenControlAction } from "@/lib/actions/informeDiarioImagen";
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
  const perfil = await requirePerfil();
  const raw = Object.fromEntries(formData) as Record<string, string>;

  const parsed = informeDiarioSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos", values: raw };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("informes_diarios").insert({
    informe_campo_id: parsed.data.informeCampoId,
    colaborador: parsed.data.colaborador,
    fecha: parsed.data.fecha,
    hectareas_aplicadas: parsed.data.hectareasAplicadas,
    tipo_aplicacion: parsed.data.tipoAplicacion,
    dosis: parsed.data.dosis,
    boquillas: parsed.data.boquillas,
    altura_vuelo: parsed.data.alturaVuelo,
    ancho_pases: parsed.data.anchoPases,
    velocidad: parsed.data.velocidad,
    nota: parsed.data.nota || null,
    imagen_control_ruta: parsed.data.imagenControlRuta || null,
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
  await requirePerfil();
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
      colaborador: parsed.data.colaborador,
      fecha: parsed.data.fecha,
      hectareas_aplicadas: parsed.data.hectareasAplicadas,
      tipo_aplicacion: parsed.data.tipoAplicacion,
      dosis: parsed.data.dosis,
      boquillas: parsed.data.boquillas,
      altura_vuelo: parsed.data.alturaVuelo,
      ancho_pases: parsed.data.anchoPases,
      velocidad: parsed.data.velocidad,
      nota: parsed.data.nota || null,
      imagen_control_ruta: parsed.data.imagenControlRuta || null,
    })
    .eq("id", parsed.data.id);

  if (error) return { error: mensajeError(error), values: raw };

  // Si se reemplazó o se quitó la imagen, se limpia la anterior en Storage
  // (best-effort, ver eliminarImagenControlAction) para no ir dejando
  // archivos huérfanos acumulándose -- mismo patrón que editarColaboradorAction.
  const imagenControlRutaAnterior = raw.imagenControlRutaAnterior;
  if (imagenControlRutaAnterior && imagenControlRutaAnterior !== parsed.data.imagenControlRuta) {
    await eliminarImagenControlAction(imagenControlRutaAnterior).catch(() => {});
  }

  revalidatePath("/informes/diario");
  revalidatePath(`/informes/diario/${parsed.data.id}`);
  redirect(`/informes/diario/${parsed.data.id}`);
}

export async function eliminarInformeDiarioAction(id: string) {
  await requirePerfil();
  const supabase = await createClient();

  const { data: informe } = await supabase
    .from("informes_diarios")
    .select("imagen_control_ruta")
    .eq("id", id)
    .maybeSingle();

  const { error } = await supabase.from("informes_diarios").delete().eq("id", id);
  if (error) throw new Error("No se pudo eliminar el informe diario.");

  if (informe?.imagen_control_ruta) {
    await eliminarImagenControlAction(informe.imagen_control_ruta).catch(() => {});
  }

  revalidatePath("/informes/diario");
}
