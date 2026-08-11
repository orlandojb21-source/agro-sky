import { requireSection } from "@/lib/session";
import { canWrite } from "@/lib/roles";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/PageHeader";
import { LinkButton } from "@/components/ui/Button";
import { ArqueosTabla, type ArqueoFila } from "@/components/forms/ArqueosTabla";

export default async function ArqueosPage() {
  const perfil = await requireSection("gastos-operativos");
  const puedeEscribir = canWrite(perfil.rol, "gastos-operativos");

  const supabase = await createClient();
  const { data } = await supabase
    .from("caja_arqueos")
    .select("id, fecha, total_contado, saldo_esperado, diferencia, nota")
    .order("fecha", { ascending: false });

  const arqueos: ArqueoFila[] = (data ?? []).map((a) => ({
    id: a.id as string,
    fecha: a.fecha as string,
    totalContado: Number(a.total_contado),
    saldoEsperado: Number(a.saldo_esperado),
    diferencia: Number(a.diferencia),
    nota: a.nota as string | null,
  }));

  return (
    <div>
      <PageHeader
        title="Caja Menuda — Arqueos"
        description="Conteo físico del efectivo en la caja, comparado contra el saldo que el sistema esperaba en ese momento."
        action={
          puedeEscribir ? (
            <LinkButton href="/gastos-operativos/arqueos/nuevo">+ Nuevo arqueo</LinkButton>
          ) : undefined
        }
      />
      <ArqueosTabla arqueos={arqueos} puedeEscribir={puedeEscribir} />
    </div>
  );
}
