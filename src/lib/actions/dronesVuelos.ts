"use server";

import { revalidatePath } from "next/cache";
import { requireWrite } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { registrarVueloDroneSchema } from "@/lib/validation/dronesVuelos";
import type { ActionState } from "./types";

// Pasa por el RPC registrar_vuelo_drone (migración 0074) en vez de un
// insert + update directo -- necesita sumar los 3 valores a los totales
// del drone de forma atómica, para no perder datos si 2 personas cargan
// un registro del mismo drone casi al mismo tiempo.
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

  if (error) return { error: "No se pudo registrar el vuelo. Intenta de nuevo.", values: raw };

  revalidatePath(`/bitacora/${parsed.data.droneId}`);
  revalidatePath("/bitacora");
  return { error: null, success: true };
}
