import { requirePerfil } from "@/lib/session";
import { canWrite } from "@/lib/roles";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/PageHeader";
import { LinkButton } from "@/components/ui/Button";
import { InformesDiariosTabla, type InformeDiarioFila } from "@/components/forms/InformesDiariosTabla";

export default async function InformeDiarioPage() {
  const perfil = await requirePerfil();
  const puedeEscribir = canWrite(perfil.rol, "informes");

  const supabase = await createClient();
  const { data } = await supabase
    .from("informes_diarios")
    .select("id, cliente, fecha, hectareas_aplicadas, informes_campo ( operador )")
    .order("fecha", { ascending: false });

  const informes: InformeDiarioFila[] = (data ?? []).map((row) => ({
    id: row.id as string,
    cliente: row.cliente as string,
    fecha: row.fecha as string,
    hectareasAplicadas: Number(row.hectareas_aplicadas),
    operadorInformeCampo: (row.informes_campo as unknown as { operador: string } | null)?.operador ?? "—",
  }));

  return (
    <div>
      <PageHeader
        title="Informe Diario"
        description="Informe informativo para el cliente, armado a partir de un Informe de Campo."
        action={
          puedeEscribir ? (
            <LinkButton href="/informes/diario/nuevo">+ Nuevo informe diario</LinkButton>
          ) : undefined
        }
      />
      <InformesDiariosTabla informes={informes} puedeEscribir={puedeEscribir} />
    </div>
  );
}
