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

export default async function ProyectosPage() {
  const perfil = await requireSection("informes");
  const puedeEscribir = canWrite(perfil.rol, "informes") && perfil.rol !== "campo";

  const supabase = await createClient();
  const { data } = await supabase
    .from("proyectos")
    .select("id, codigo, nombre, tipo_proyecto, estado, clientes ( nombre )")
    .order("creado_en", { ascending: false });

  const proyectos: ProyectoCatalogoFila[] = ((data ?? []) as unknown as FilaProyecto[]).map((p) => ({
    id: p.id,
    codigo: p.codigo,
    nombre: p.nombre,
    clienteNombre: p.clientes?.nombre ?? "—",
    tipoProyecto: p.tipo_proyecto,
    estado: p.estado,
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
