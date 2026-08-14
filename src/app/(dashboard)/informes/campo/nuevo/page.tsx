import { requireWrite } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { InformeCampoForm, type ProyectoOpcionInformeCampo } from "@/components/forms/InformeCampoForm";

type FilaProyecto = {
  id: string;
  codigo: string;
  nombre: string;
  tipo_proyecto: "ingenio_santa_rosa" | "particular";
  clientes: { nombre: string } | null;
};

export default async function NuevoInformeCampoPage() {
  await requireWrite("informes");
  const fechaHoy = new Date().toISOString().slice(0, 10);

  const supabase = await createClient();
  const [{ data: colaboradoresData }, { data: proyectosData }] = await Promise.all([
    supabase.from("colaboradores").select("nombre").eq("tipo", "campo").order("nombre"),
    supabase.from("proyectos").select("id, codigo, nombre, tipo_proyecto, clientes ( nombre )").order("codigo"),
  ]);

  const colaboradoresCampo = (colaboradoresData ?? []).map((c) => c.nombre as string);
  const proyectos: ProyectoOpcionInformeCampo[] = ((proyectosData ?? []) as unknown as FilaProyecto[]).map((p) => ({
    id: p.id,
    codigo: p.codigo,
    nombre: p.nombre,
    clienteNombre: p.clientes?.nombre ?? "—",
    tipoProyecto: p.tipo_proyecto,
  }));

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-green-900 dark:text-green-50">
        Nuevo informe de campo
      </h1>
      <InformeCampoForm
        fechaHoy={fechaHoy}
        colaboradoresCampo={colaboradoresCampo}
        proyectos={proyectos}
      />
    </div>
  );
}
