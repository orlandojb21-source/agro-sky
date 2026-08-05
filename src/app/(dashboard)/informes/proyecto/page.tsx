import { requirePerfil } from "@/lib/session";
import { canWrite } from "@/lib/roles";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/PageHeader";
import { LinkButton } from "@/components/ui/Button";
import { ProyectoInformesTabla, type InformeProyectoFila } from "@/components/forms/ProyectoInformesTabla";

export default async function ProyectosPage() {
  const perfil = await requirePerfil();
  const puedeEscribir = canWrite(perfil.rol, "informes");

  const supabase = await createClient();
  const { data } = await supabase
    .from("proyecto_informes")
    .select("id, proyecto, ubicacion, fecha_desde, fecha_hasta, hectareas, precio, total")
    .order("fecha_desde", { ascending: false });

  const informes: InformeProyectoFila[] = (data ?? []).map((row) => ({
    id: row.id as string,
    proyecto: row.proyecto as string,
    ubicacion: row.ubicacion as string | null,
    fechaDesde: row.fecha_desde as string,
    fechaHasta: row.fecha_hasta as string,
    hectareas: row.hectareas === null ? null : Number(row.hectareas),
    precio: row.precio === null ? null : Number(row.precio),
    total: row.total === null ? null : Number(row.total),
  }));

  return (
    <div>
      <PageHeader
        title="Análisis de Proyecto"
        action={
          puedeEscribir ? <LinkButton href="/informes/proyecto/nuevo">+ Nuevo informe</LinkButton> : undefined
        }
      />
      <ProyectoInformesTabla informes={informes} puedeEscribir={puedeEscribir} />
    </div>
  );
}
