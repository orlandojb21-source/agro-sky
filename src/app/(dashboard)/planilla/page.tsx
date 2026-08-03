import { requireSection } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/PageHeader";
import { LinkButton } from "@/components/ui/Button";
import { AsistenciaTabla, type AsistenciaFila } from "@/components/forms/AsistenciaTabla";

export default async function AsistenciaPage() {
  await requireSection("planilla");

  const supabase = await createClient();
  const { data } = await supabase
    .from("planilla_asistencia")
    .select("id, colaborador, fecha, rol_dia, tipo_trabajo, jornada, descripcion")
    .order("fecha", { ascending: false });

  const asistencia: AsistenciaFila[] = (data ?? []).map((a) => ({
    id: a.id as string,
    colaborador: a.colaborador as string,
    fecha: a.fecha as string,
    rolDia: a.rol_dia as "operador" | "ayudante",
    tipoTrabajo: a.tipo_trabajo as "proyecto" | "oficina",
    jornada: a.jornada as "completo" | "medio" | "proyecto",
    descripcion: a.descripcion as string,
  }));

  return (
    <div>
      <PageHeader
        title="Asistencia"
        description="Registro diario de Asistencia"
        action={
          <div className="flex gap-2">
            <LinkButton href="/planilla/colaboradores" variant="secondary">
              Colaboradores
            </LinkButton>
            <LinkButton href="/planilla/nuevo">+ Nueva asistencia</LinkButton>
          </div>
        }
      />
      <AsistenciaTabla asistencia={asistencia} />
    </div>
  );
}
