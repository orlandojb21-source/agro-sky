import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/PageHeader";
import { LinkButton } from "@/components/ui/Button";
import { InformesDiariosTabla, type InformeDiarioFila } from "@/components/forms/InformesDiariosTabla";

export default async function InformeDiarioPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("informes_diarios")
    .select("id, colaborador, fecha, hectareas_aplicadas, informes_campo ( cliente )")
    .order("fecha", { ascending: false });

  const informes: InformeDiarioFila[] = (data ?? []).map((row) => ({
    id: row.id as string,
    colaborador: row.colaborador as string,
    fecha: row.fecha as string,
    hectareasAplicadas: Number(row.hectareas_aplicadas),
    clienteInformeCampo: (row.informes_campo as unknown as { cliente: string } | null)?.cliente ?? "—",
  }));

  return (
    <div>
      <PageHeader
        title="Informe Diario"
        description="Informe informativo para el cliente, armado a partir de un Informe de Campo -- no afecta el pago de planilla."
        action={<LinkButton href="/informes/diario/nuevo">+ Nuevo informe diario</LinkButton>}
      />
      <InformesDiariosTabla informes={informes} />
    </div>
  );
}
