"use server";

import { randomUUID } from "node:crypto";
import { requirePerfil } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { TAMANO_MAXIMO_ARCHIVO_BYTES } from "@/lib/limitesArchivos";

// Bucket privado (ver migración 0047) -- informes_campo.firma_agro_ruta /
// firma_cliente_ruta guardan solo esta ruta, nunca una URL pública. Mismo
// patrón que colaboradorFoto.ts.
const BUCKET = "informes-campo-firmas";

export async function subirFirmaInformeCampoAction(formData: FormData): Promise<{ ruta: string }> {
  await requirePerfil();
  const archivo = formData.get("firma");
  if (!(archivo instanceof Blob)) throw new Error("No se recibió ninguna firma.");
  if (archivo.size > TAMANO_MAXIMO_ARCHIVO_BYTES) {
    throw new Error("La firma es demasiado grande (máximo 5 MB).");
  }

  const supabase = await createClient();
  const ruta = `${randomUUID()}.png`;
  const { error } = await supabase.storage.from(BUCKET).upload(ruta, archivo, {
    contentType: "image/png",
    upsert: false,
  });
  if (error) throw new Error("No se pudo guardar la firma. Intenta de nuevo.");

  return { ruta };
}

// Limpieza best-effort (firma rehecha o informe eliminado) -- si falla,
// queda un archivo huérfano en Storage, pero eso no debe bloquear la
// acción principal.
export async function eliminarFirmaInformeCampoAction(ruta: string): Promise<void> {
  await requirePerfil();
  const supabase = await createClient();
  await supabase.storage.from(BUCKET).remove([ruta]);
}
