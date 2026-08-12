"use server";

import { randomUUID } from "node:crypto";
import { requireWrite } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { TAMANO_MAXIMO_ARCHIVO_BYTES } from "@/lib/limitesArchivos";

// Bucket privado (ver migración 0078) -- mismo patrón que
// informeCampoImagen.ts: se sube directo desde el formulario (no ligada
// todavía al id del correctivo, que no existe hasta guardar) y se
// referencia recién al llamar crear_mantenimiento_correctivo.
const BUCKET = "mantenimientos-correctivos-imagenes";

export async function subirImagenMantenimientoCorrectivoAction(formData: FormData): Promise<{ ruta: string }> {
  await requireWrite("bitacora");
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

// Limpieza best-effort -- si falla, queda un archivo huérfano en Storage,
// pero eso no debe bloquear la acción principal (quitar del borrador
// antes de guardar, o eliminar el mantenimiento ya guardado).
export async function eliminarImagenMantenimientoCorrectivoAction(ruta: string): Promise<void> {
  await requireWrite("bitacora");
  const supabase = await createClient();
  await supabase.storage.from(BUCKET).remove([ruta]);
}
