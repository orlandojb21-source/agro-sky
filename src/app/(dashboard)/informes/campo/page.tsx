import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/PageHeader";
import { LinkButton } from "@/components/ui/Button";
import { InformesCampoTabla, type InformeCampoFila } from "@/components/forms/InformesCampoTabla";

export default async function InformesCampoPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("informes_campo")
    .select("id, cliente, fecha, finca, operador, informe_campo_parcelas ( hectareas )")
    .order("fecha", { ascending: false });

  const informes: InformeCampoFila[] = (data ?? []).map((row) => ({
    id: row.id as string,
    cliente: row.cliente as string,
    fecha: row.fecha as string,
    finca: row.finca as string,
    operador: row.operador as string,
    hectareas: ((row.informe_campo_parcelas ?? []) as { hectareas: number }[]).reduce(
      (s, p) => s + Number(p.hectareas),
      0,
    ),
  }));

  return (
    <div>
      <PageHeader
        title="Informes de Campo"
        description="Informe diario de vuelo que se envía al cliente."
        action={<LinkButton href="/informes/campo/nuevo">+ Nuevo informe</LinkButton>}
      />
      <InformesCampoTabla informes={informes} />
    </div>
  );
}
