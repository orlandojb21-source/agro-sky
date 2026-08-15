import { requireSection } from "@/lib/session";
import { canWrite } from "@/lib/roles";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/PageHeader";
import { LinkButton } from "@/components/ui/Button";
import { ProyectoCatalogoTabla, type ProyectoCatalogoFila } from "@/components/forms/ProyectoCatalogoTabla";

type FilaProyecto = {
  id: string;
  codigo: string;
  nombre: string;
  tipo_proyecto: "ingenio_santa_rosa" | "particular";
  estado: "abierto" | "cerrado";
  clientes: { nombre: string } | null;
};

type FilaInformeCampo = {
  proyecto_id: string;
  informe_campo_parcelas: { hectareas: number }[] | null;
};

export default async function ProyectosPage() {
  const perfil = await requireSection("informes");
  const puedeEscribir = canWrite(perfil.rol, "informes") && perfil.rol !== "campo";

  const supabase = await createClient();
  const [{ data }, { data: informesData }] = await Promise.all([
    supabase
      .from("proyectos")
      .select("id, codigo, nombre, tipo_proyecto, estado, clientes ( nombre )")
      .order("codigo"),
    // Suma de hectáreas por Proyecto -- se calcula acá (no en la base)
    // sumando las parcelas de todos los Informes de Campo que apuntan a
    // cada proyecto_id, mismo patrón ya usado para el total por informe.
    supabase.from("informes_campo").select("proyecto_id, informe_campo_parcelas ( hectareas )"),
  ]);

  const hectareasPorProyecto = new Map<string, number>();
  for (const informe of (informesData ?? []) as unknown as FilaInformeCampo[]) {
    const subtotal = (informe.informe_campo_parcelas ?? []).reduce((s, p) => s + Number(p.hectareas), 0);
    hectareasPorProyecto.set(
      informe.proyecto_id,
      (hectareasPorProyecto.get(informe.proyecto_id) ?? 0) + subtotal,
    );
  }

  const proyectos: ProyectoCatalogoFila[] = ((data ?? []) as unknown as FilaProyecto[]).map((p) => ({
    id: p.id,
    codigo: p.codigo,
    nombre: p.nombre,
    clienteNombre: p.clientes?.nombre ?? "—",
    tipoProyecto: p.tipo_proyecto,
    estado: p.estado,
    hectareas: hectareasPorProyecto.get(p.id) ?? 0,
  }));

  return (
    <div>
      <PageHeader
        title="Proyectos"
        action={puedeEscribir ? <LinkButton href="/informes/proyectos/nuevo">+ Nuevo proyecto</LinkButton> : undefined}
      />
      <ProyectoCatalogoTabla proyectos={proyectos} puedeEscribir={puedeEscribir} />
    </div>
  );
}
