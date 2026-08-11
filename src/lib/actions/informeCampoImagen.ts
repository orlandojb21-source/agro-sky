"use server";

import { randomUUID } from "node:crypto";
import { requireWrite } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { TAMANO_MAXIMO_ARCHIVO_BYTES } from "@/lib/limitesArchivos";

// Bucket privado (ver migración 0064) -- imagen_ruta en informes_campo
// guarda solo esta ruta, nunca una URL pública. Mismo patrón que
// colaboradorFoto.ts: se sube directo desde el formulario (no ligada
// todavía al id del informe, que puede no existir aún si se está creando
// uno nuevo) y se referencia recién al guardar el formulario.
const BUCKET = "informes-campo-imagenes";

export async function subirImagenInformeCampoAction(formData: FormData): Promise<{ ruta: string }> {
  await requireWrite("informes");
  const archivo = formData.get("imagen");
  if (!(archivo instanceof Blob)) throw new Error("No se recibió ninguna imagen.");
  if (archivo.size > TAMANO_MAXIMO_ARCHIVO_BYTES) {
    throw new Error("La imagen es demasiado grande (máximo 5 MB).");
  }

  const supabase = await createClient();
  const ruta = `${randomUUID()}.jpg`;
  const { error } = await supabase.storage.from(BUCKET).upload(ruta, archivo, {
    contentType: "image/jpeg",
    upsert: false,
  });
  if (error) throw new Error("No se pudo subir la imagen. Intenta de nuevo.");

  return { ruta };
}

// Limpieza best-effort (imagen reemplazada o informe eliminado) -- si
// falla, queda un archivo huérfano en Storage, pero eso no debe bloquear
// la acción principal (guardar/eliminar el informe).
export async function eliminarImagenInformeCampoAction(ruta: string): Promise<void> {
  await requireWrite("informes");
  const supabase = await createClient();
  await supabase.storage.from(BUCKET).remove([ruta]);
}
