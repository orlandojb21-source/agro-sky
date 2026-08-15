import { notFound } from "next/navigation";
import { requireWrite } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { ProyectoInformeForm, type ProyectoOpcion } from "@/components/forms/ProyectoInformeForm";

type ItemGastoFila = { categoria: string; cantidad: number; precio: number };
type BloqueGastoFila = {
  operador: string | null;
  ayudantes: string[] | null;
  proyecto_gastos_operativos_items: ItemGastoFila[] | null;
};
type FilaProyecto = {
  id: string;
  codigo: string;
  nombre: string;
  clientes: { nombre: string } | null;
};

export default async function EditarInformeProyectoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await requireWrite("informes");

  const supabase = await createClient();
  const [{ data: informe }, { data: filasData }, { data: gastosData }, { data: proyectosData }, { data: planillaDetalleData }] =
    await Promise.all([
      supabase
        .from("proyecto_informes")
        .select("id, proyecto_id, ubicacion, hectareas, precio, total, fecha")
        .eq("id", id)
        .maybeSingle(),
      supabase
        .from("proyecto_filas")
        .select("informe_campo_id, drone, hectareas, precio")
        .eq("informe_id", id)
        .order("id"),
      supabase
        .from("proyecto_gastos_operativos")
        .select("operador, ayudantes, proyecto_gastos_operativos_items ( categoria, cantidad, precio )")
        .eq("informe_id", id)
        .order("id"),
      supabase.from("proyectos").select("id, codigo, nombre, clientes ( nombre )").order("codigo"),
      supabase
        .from("proyecto_planilla_detalle")
        .select("informe_campo_id, colaborador, fecha, monto")
        .eq("informe_id", id)
        .order("fecha"),
    ]);

  if (!informe) notFound();

  const proyectos: ProyectoOpcion[] = ((proyectosData ?? []) as unknown as FilaProyecto[]).map((p) => ({
    id: p.id,
    codigo: p.codigo,
    nombre: p.nombre,
    clienteNombre: p.clientes?.nombre ?? "—",
  }));
  const proyectoActual = proyectos.find((p) => p.id === informe.proyecto_id);

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-green-900 dark:text-green-50">
        Editar análisis de proyecto
      </h1>
      <ProyectoInformeForm
        fechaHoy={informe.fecha as string}
        proyectos={proyectos}
        valoresIniciales={{
          id: informe.id as string,
          proyectoId: informe.proyecto_id as string,
          cliente: proyectoActual?.clienteNombre ?? "—",
          ubicacion: informe.ubicacion as string | null,
          hectareas: informe.hectareas === null ? null : Number(informe.hectareas),
          precio: informe.precio === null ? null : Number(informe.precio),
          total: informe.total === null ? null : Number(informe.total),
          fecha: informe.fecha as string,
          filas: (filasData ?? []).map((f) => ({
            informeCampoId: f.informe_campo_id as string,
            drone: f.drone as string,
            hectareas: Number(f.hectareas),
            precio: Number(f.precio),
          })),
          gastosOperativos: ((gastosData ?? []) as unknown as BloqueGastoFila[]).map((b) => ({
            operador: b.operador,
            ayudantes: b.ayudantes ?? [],
            items: (b.proyecto_gastos_operativos_items ?? []).map((it) => ({
              categoria: it.categoria,
              cantidad: Number(it.cantidad),
              precio: Number(it.precio),
            })),
          })),
          detallePlanilla: (planillaDetalleData ?? []).map((d) => ({
            informeCampoId: d.informe_campo_id as string,
            colaborador: d.colaborador as string,
            fecha: d.fecha as string,
            monto: Number(d.monto),
          })),
        }}
      />
    </div>
  );
}
