import { notFound } from "next/navigation";
import { requireSection } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { ProyectoInformeForm } from "@/components/forms/ProyectoInformeForm";

export default async function EditarInformeProyectoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await requireSection("proyectos");

  const supabase = await createClient();
  const [{ data: informe }, { data: filasData }] = await Promise.all([
    supabase
      .from("proyecto_informes")
      .select("id, proyecto, ubicacion, hectareas, precio, total, fecha_desde, fecha_hasta")
      .eq("id", id)
      .maybeSingle(),
    supabase.from("proyecto_filas").select("drone, hectareas, precio").eq("informe_id", id).order("id"),
  ]);

  if (!informe) notFound();

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-green-900 dark:text-green-50">
        Editar informe de proyecto
      </h1>
      <ProyectoInformeForm
        fechaHoy={informe.fecha_desde as string}
        fechaHastaSugerida={informe.fecha_hasta as string}
        valoresIniciales={{
          id: informe.id as string,
          proyecto: informe.proyecto as string,
          ubicacion: informe.ubicacion as string | null,
          hectareas: informe.hectareas === null ? null : Number(informe.hectareas),
          precio: informe.precio === null ? null : Number(informe.precio),
          total: informe.total === null ? null : Number(informe.total),
          fechaDesde: informe.fecha_desde as string,
          fechaHasta: informe.fecha_hasta as string,
          filas: (filasData ?? []).map((f) => ({
            drone: f.drone as string,
            hectareas: Number(f.hectareas),
            precio: Number(f.precio),
          })),
        }}
      />
    </div>
  );
}
