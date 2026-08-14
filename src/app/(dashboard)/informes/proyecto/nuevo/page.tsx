import { requireWrite } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { ProyectoInformeForm, type ProyectoOpcion } from "@/components/forms/ProyectoInformeForm";

type FilaProyecto = {
  id: string;
  codigo: string;
  nombre: string;
  clientes: { nombre: string } | null;
};

export default async function NuevoInformeProyectoPage() {
  await requireWrite("informes");
  const fechaHoy = new Date().toISOString().slice(0, 10);

  const supabase = await createClient();
  const { data: proyectosData } = await supabase
    .from("proyectos")
    .select("id, codigo, nombre, clientes ( nombre )")
    .order("codigo");

  const proyectos: ProyectoOpcion[] = ((proyectosData ?? []) as unknown as FilaProyecto[]).map((p) => ({
    id: p.id,
    codigo: p.codigo,
    nombre: p.nombre,
    clienteNombre: p.clientes?.nombre ?? "—",
  }));

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-green-900 dark:text-green-50">
        Nuevo análisis de proyecto
      </h1>
      <ProyectoInformeForm fechaHoy={fechaHoy} proyectos={proyectos} />
    </div>
  );
}
