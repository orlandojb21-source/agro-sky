import { notFound } from "next/navigation";
import { requireWrite } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import {
  InformeDiarioForm,
  type InformeCampoOpcion,
  type ValoresInformeDiario,
} from "@/components/forms/InformeDiarioForm";

const BUCKET_CAPTURAS = "informes-diarios-capturas";
const DURACION_URL_FIRMADA_SEG = 3600;

export default async function EditarInformeDiarioPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await requireWrite("informes");

  const supabase = await createClient();
  const [{ data: informe }, { data: informesCampoData }, { data: informesDiariosData }] = await Promise.all([
    supabase.from("informes_diarios").select("*").eq("id", id).maybeSingle(),
    supabase
      .from("informes_campo")
      .select("id, cliente, finca, fecha, operador, dosis_por_hectarea, informe_campo_parcelas ( hectareas )")
      .order("fecha", { ascending: false }),
    supabase.from("informes_diarios").select("id, informe_campo_id"),
  ]);

  if (!informe) notFound();

  // Igual que en "nuevo", pero sin excluir el propio Informe de Campo que
  // este informe diario ya tiene vinculado (si no, desaparecería de la
  // lista al editar).
  const idsVinculadosAOtros = new Set(
    (informesDiariosData ?? [])
      .filter((d) => d.id !== id)
      .map((d) => d.informe_campo_id as string),
  );
  const informesCampoDisponibles: InformeCampoOpcion[] = (informesCampoData ?? [])
    .filter((row) => !idsVinculadosAOtros.has(row.id as string))
    .map((row) => ({
      id: row.id as string,
      cliente: row.cliente as string,
      finca: row.finca as string,
      fecha: row.fecha as string,
      operador: row.operador as string,
      dosisPorHectarea: row.dosis_por_hectarea as string,
      hectareas: ((row.informe_campo_parcelas ?? []) as { hectareas: number }[]).reduce(
        (s, p) => s + Number(p.hectareas),
        0,
      ),
    }));

  let imagenControlUrl: string | null = null;
  if (informe.imagen_control_ruta) {
    const { data } = await supabase.storage
      .from(BUCKET_CAPTURAS)
      .createSignedUrl(informe.imagen_control_ruta as string, DURACION_URL_FIRMADA_SEG);
    imagenControlUrl = data?.signedUrl ?? null;
  }

  const valoresIniciales: ValoresInformeDiario = {
    id: informe.id as string,
    informeCampoId: informe.informe_campo_id as string,
    cliente: informe.cliente as string,
    fecha: informe.fecha as string,
    hectareasAplicadas: Number(informe.hectareas_aplicadas),
    tipoAplicacion: informe.tipo_aplicacion as string,
    dosis: informe.dosis as string,
    boquillas: informe.boquillas as string,
    alturaVuelo: informe.altura_vuelo as string,
    anchoPases: informe.ancho_pases as string,
    velocidad: informe.velocidad as string,
    nota: informe.nota as string | null,
    imagenControlRuta: informe.imagen_control_ruta as string | null,
    imagenControlUrl,
  };

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-green-900 dark:text-green-50">
        Editar informe diario
      </h1>
      <InformeDiarioForm
        informesCampoDisponibles={informesCampoDisponibles}
        valoresIniciales={valoresIniciales}
      />
    </div>
  );
}
