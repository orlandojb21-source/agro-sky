import type { createClient } from "@/lib/supabase/server";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

const BUCKET_IMAGENES = "informes-campo-imagenes";
const DURACION_URL_FIRMADA_SEG = 3600;

// Informe Diario ya no tiene su propio campo de adjuntar imagen (ver
// migración 0069) -- la imagen real vive en el Informe de Campo vinculado
// (informe_campo_imagenes, migración 0065). Este helper arma un mapa
// informeCampoId -> URLs firmadas para mostrarlas como vista previa al
// elegir o ver un Informe de Campo desde Informe Diario.
export async function obtenerImagenesPorInformeCampo(
  supabase: SupabaseServerClient,
  informeCampoIds: string[],
): Promise<Map<string, string[]>> {
  const mapa = new Map<string, string[]>();
  if (informeCampoIds.length === 0) return mapa;

  const { data } = await supabase
    .from("informe_campo_imagenes")
    .select("informe_id, ruta")
    .in("informe_id", informeCampoIds)
    .order("creado_en");

  for (const fila of data ?? []) {
    const informeId = fila.informe_id as string;
    const { data: firmada } = await supabase.storage
      .from(BUCKET_IMAGENES)
      .createSignedUrl(fila.ruta as string, DURACION_URL_FIRMADA_SEG);
    if (!firmada?.signedUrl) continue;
    const urlsActuales = mapa.get(informeId) ?? [];
    urlsActuales.push(firmada.signedUrl);
    mapa.set(informeId, urlsActuales);
  }

  return mapa;
}
