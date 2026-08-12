"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireWrite } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { registrarVueloDroneSchema } from "@/lib/validation/dronesVuelos";
import type { ActionState } from "./types";

// Pasa por el RPC registrar_vuelo_drone (migración 0075) en vez de un
// insert + update directo -- el operador carga la LECTURA NUEVA (el
// total acumulado a esa fecha, no lo que sumó ese trabajo); el RPC
// calcula la diferencia contra la lectura anterior del drone (de forma
// atómica, bloqueando la fila para no perder datos si 2 personas cargan
// un registro del mismo drone casi al mismo tiempo) y deja el drone con
// esos totales nuevos.
export async function registrarVueloDroneAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireWrite("bitacora");
  const raw = Object.fromEntries(formData) as Record<string, string>;

  const parsed = registrarVueloDroneSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos", values: raw };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("registrar_vuelo_drone", {
    p_drone_id: parsed.data.droneId,
    p_fecha: parsed.data.fecha,
    p_operador: parsed.data.operador,
    p_horas_vuelo: parsed.data.horasVuelo,
    p_area_cubierta: parsed.data.areaCubierta,
    p_vuelos: parsed.data.vuelos,
  });

  if (error) return { error: "No se pudo guardar el registro. Intenta de nuevo.", values: raw };

  revalidatePath("/bitacora/vuelos");
  revalidatePath(`/bitacora/${parsed.data.droneId}`);
  revalidatePath("/bitacora");
  redirect("/bitacora/vuelos");
}
