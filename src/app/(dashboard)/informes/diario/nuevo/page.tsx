import { requireWrite } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { InformeDiarioForm, type InformeCampoOpcion } from "@/components/forms/InformeDiarioForm";

export default async function NuevoInformeDiarioPage() {
  await requireWrite("informes");

  const supabase = await createClient();
  const [{ data: informesCampoData }, { data: informesDiariosData }] = await Promise.all([
    supabase
      .from("informes_campo")
      .select("id, cliente, finca, fecha, operador, dosis_por_hectarea, informe_campo_parcelas ( hectareas )")
      .order("fecha", { ascending: false }),
    supabase.from("informes_diarios").select("informe_campo_id"),
  ]);

  // Solo se ofrecen los Informes de Campo que todavía no tienen un Informe
  // Diario (confirmado por el usuario: uno por cada Informe de Campo, nunca
  // uno que junte varios).
  const idsYaVinculados = new Set((informesDiariosData ?? []).map((d) => d.informe_campo_id as string));
  const informesCampoDisponibles: InformeCampoOpcion[] = (informesCampoData ?? [])
    .filter((row) => !idsYaVinculados.has(row.id as string))
    .map((row) => ({
      id: row.id as string,
      cliente: row.cliente as string,
      finca: row.finca as string,
      fecha: row.fecha as string,
      operador: row.operador as string,
      dosisPorHectarea: Number(row.dosis_por_hectarea),
      hectareas: ((row.informe_campo_parcelas ?? []) as { hectareas: number }[]).reduce(
        (s, p) => s + Number(p.hectareas),
        0,
      ),
    }));

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-green-900 dark:text-green-50">
        Nuevo informe diario
      </h1>
      <InformeDiarioForm informesCampoDisponibles={informesCampoDisponibles} />
    </div>
  );
}
