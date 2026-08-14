import { requireSection } from "@/lib/session";
import { canWrite } from "@/lib/roles";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/PageHeader";
import { LinkButton } from "@/components/ui/Button";
import { ControlHorarioTabla, type ControlHorarioFila } from "@/components/forms/ControlHorarioTabla";

export default async function ControlHorarioPage() {
  const perfil = await requireSection("planilla");
  const puedeEscribir = canWrite(perfil.rol, "planilla");

  const supabase = await createClient();
  const { data } = await supabase
    .from("control_horario")
    .select("id, colaborador, fecha, cumplio, nota")
    .order("fecha", { ascending: false });

  const registros: ControlHorarioFila[] = (data ?? []).map((r) => ({
    id: r.id as string,
    colaborador: r.colaborador as string,
    fecha: r.fecha as string,
    cumplio: r.cumplio as boolean,
    nota: r.nota as string | null,
  }));

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Control de Horario"
        description="Cumplimiento diario del horario de colaboradores Fijos (44h semanales)."
        action={
          puedeEscribir ? <LinkButton href="/planilla/horario/nuevo">+ Nuevo registro</LinkButton> : undefined
        }
      />
      <ControlHorarioTabla registros={registros} puedeEscribir={puedeEscribir} />
    </div>
  );
}
