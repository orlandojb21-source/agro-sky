import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ProyectoInformeForm } from "@/components/forms/ProyectoInformeForm";

type ItemGastoFila = { categoria: string; cantidad: number; precio: number };
type BloqueGastoFila = {
  drone: string;
  operador: string | null;
  ayudantes: string[] | null;
  proyecto_gastos_operativos_items: ItemGastoFila[] | null;
};

export default async function EditarInformeProyectoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const supabase = await createClient();
  const [{ data: informe }, { data: filasData }, { data: gastosData }, { data: colaboradoresData }] =
    await Promise.all([
      supabase
        .from("proyecto_informes")
        .select("id, proyecto, ubicacion, hectareas, precio, total, fecha_desde, fecha_hasta")
        .eq("id", id)
        .maybeSingle(),
      supabase.from("proyecto_filas").select("drone, hectareas, precio").eq("informe_id", id).order("id"),
      supabase
        .from("proyecto_gastos_operativos")
        .select("drone, operador, ayudantes, proyecto_gastos_operativos_items ( categoria, cantidad, precio )")
        .eq("informe_id", id)
        .order("id"),
      supabase.from("colaboradores").select("nombre").eq("tipo", "campo").order("nombre"),
    ]);

  if (!informe) notFound();

  const colaboradoresCampo = (colaboradoresData ?? []).map((c) => c.nombre as string);

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-green-900 dark:text-green-50">
        Editar informe de proyecto
      </h1>
      <ProyectoInformeForm
        fechaHoy={informe.fecha_desde as string}
        fechaHastaSugerida={informe.fecha_hasta as string}
        colaboradoresCampo={colaboradoresCampo}
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
          gastosOperativos: ((gastosData ?? []) as unknown as BloqueGastoFila[]).map((b) => ({
            drone: b.drone,
            operador: b.operador,
            ayudantes: b.ayudantes ?? [],
            items: (b.proyecto_gastos_operativos_items ?? []).map((it) => ({
              categoria: it.categoria,
              cantidad: Number(it.cantidad),
              precio: Number(it.precio),
            })),
          })),
        }}
      />
    </div>
  );
}
