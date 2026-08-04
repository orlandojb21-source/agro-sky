"use server";

import { randomUUID } from "node:crypto";
import { requirePerfil } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { TAMANO_MAXIMO_ARCHIVO_BYTES } from "@/lib/limitesArchivos";

// Bucket privado (ver migración 0056) -- gastos.comprobante_ruta guarda
// solo esta ruta, nunca una URL pública. Mismo patrón que
// colaboradorFoto.ts: se sube directo desde el formulario (no ligada
// todavía al id del gasto, que puede no existir aún si se está creando
// uno nuevo) y se referencia recién al guardar el formulario.
const BUCKET = "gastos-comprobantes";

export async function subirComprobanteGastoAction(formData: FormData): Promise<{ ruta: string }> {
  await requirePerfil();
  const archivo = formData.get("comprobante");
  if (!(archivo instanceof Blob)) throw new Error("No se recibió ningún comprobante.");
  if (archivo.size > TAMANO_MAXIMO_ARCHIVO_BYTES) {
    throw new Error("El comprobante es demasiado grande (máximo 5 MB).");
  }

  const supabase = await createClient();
  const ruta = `${randomUUID()}.jpg`;
  const { error } = await supabase.storage.from(BUCKET).upload(ruta, archivo, {
    contentType: "image/jpeg",
    upsert: false,
  });
  if (error) throw new Error("No se pudo subir el comprobante. Intenta de nuevo.");

  return { ruta };
}

// Limpieza best-effort (comprobante reemplazado o gasto eliminado) -- si
// falla, queda un archivo huérfano en Storage, pero eso no debe bloquear
// la acción principal.
export async function eliminarComprobanteGastoAction(ruta: string): Promise<void> {
  await requirePerfil();
  const supabase = await createClient();
  await supabase.storage.from(BUCKET).remove([ruta]);
}
