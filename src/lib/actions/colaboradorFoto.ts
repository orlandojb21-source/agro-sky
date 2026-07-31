"use server";

import { randomUUID } from "node:crypto";
import { requirePerfil } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";

// Bucket privado (ver migración 0046) -- foto_ruta en colaboradores guarda
// solo esta ruta, nunca una URL pública. Se sube directo desde el
// formulario (no ligado todavía al id del colaborador, que puede no
// existir aún si se está creando uno nuevo) y se referencia recién al
// guardar el formulario.
const BUCKET = "colaboradores-fotos";

export async function subirFotoColaboradorAction(formData: FormData): Promise<{ ruta: string }> {
  await requirePerfil();
  const archivo = formData.get("foto");
  if (!(archivo instanceof Blob)) throw new Error("No se recibió ninguna foto.");

  const supabase = await createClient();
  const ruta = `${randomUUID()}.jpg`;
  const { error } = await supabase.storage.from(BUCKET).upload(ruta, archivo, {
    contentType: "image/jpeg",
    upsert: false,
  });
  if (error) throw new Error("No se pudo subir la foto. Intenta de nuevo.");

  return { ruta };
}

// Limpieza best-effort (foto reemplazada o colaborador eliminado) -- si
// falla, queda un archivo huérfano en Storage, pero eso no debe bloquear
// la acción principal (guardar/eliminar el colaborador).
export async function eliminarFotoColaboradorAction(ruta: string): Promise<void> {
  await requirePerfil();
  const supabase = await createClient();
  await supabase.storage.from(BUCKET).remove([ruta]);
}
