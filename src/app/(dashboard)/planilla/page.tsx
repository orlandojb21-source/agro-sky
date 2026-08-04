import { requireSection } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/PageHeader";
import { LinkButton } from "@/components/ui/Button";
import { AsistenciaTabla, type AsistenciaFila } from "@/components/forms/AsistenciaTabla";
import { VistaPreviaQuincena } from "@/components/forms/VistaPreviaQuincena";
import { obtenerQuincenaActual } from "@/lib/planilla";
import { obtenerResumenAsistenciaAction } from "@/lib/actions/asistencia";

export default async function AsistenciaPage() {
  const perfil = await requireSection("planilla");

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

  // Vista previa exclusiva del rol "jefe" (pedido explícito del usuario,
  // 2026-08-04 -- "esto solo lo debe ver el jefe"). Solo Campo tiene
  // Asistencia (Fijo ya tiene un salario quincenal fijo, no depende de
  // días trabajados), así que la proyección solo aplica a Campo.
  let vistaPreviaQuincena: { colaborador: string; total: number }[] | null = null;
  const quincena = obtenerQuincenaActual();
  if (perfil.rol === "jefe") {
    const colaboradoresConAsistencia = [
      ...new Set(
        (data ?? [])
          .filter((a) => a.fecha >= quincena.fechaDesde && a.fecha <= quincena.fechaHasta)
          .map((a) => a.colaborador as string),
      ),
    ];
    const resumenes = await Promise.all(
      colaboradoresConAsistencia.map(async (colaborador) => ({
        colaborador,
        total: (
          await obtenerResumenAsistenciaAction(colaborador, quincena.fechaDesde, quincena.fechaHasta)
        ).totalSugerido,
      })),
    );
    vistaPreviaQuincena = resumenes.sort((a, b) => a.colaborador.localeCompare(b.colaborador));
  }

  return (
    <div className="flex flex-col gap-6">
      {vistaPreviaQuincena && (
        <VistaPreviaQuincena etiquetaQuincena={quincena.etiqueta} porColaborador={vistaPreviaQuincena} />
      )}
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
    </div>
  );
}
