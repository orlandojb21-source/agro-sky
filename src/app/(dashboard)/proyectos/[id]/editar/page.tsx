import { notFound } from "next/navigation";
import { requireSection } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import {
  ProyectoInformeForm,
  type PagoPlanillaProyecto,
  type GastoViaticoCajaMenuda,
} from "@/components/forms/ProyectoInformeForm";

type ItemGastoFila = { categoria: string; cantidad: number; precio: number };
type BloqueGastoFila = { drone: string; proyecto_gastos_operativos_items: ItemGastoFila[] | null };

export default async function EditarInformeProyectoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await requireSection("proyectos");

  const supabase = await createClient();
  const [{ data: informe }, { data: filasData }, { data: gastosData }, { data: pagosData }, { data: viaticosData }] =
    await Promise.all([
      supabase
        .from("proyecto_informes")
        .select("id, proyecto, ubicacion, hectareas, precio, total, fecha_desde, fecha_hasta")
        .eq("id", id)
        .maybeSingle(),
      supabase.from("proyecto_filas").select("drone, hectareas, precio").eq("informe_id", id).order("id"),
      supabase
        .from("proyecto_gastos_operativos")
        .select("drone, proyecto_gastos_operativos_items ( categoria, cantidad, precio )")
        .eq("informe_id", id)
        .order("id"),
      supabase.from("planilla_pagos").select("descripcion, fecha, monto").eq("tipo_trabajo", "proyecto"),
      supabase.from("caja_gastos").select("concepto, fecha, monto").eq("categoria", "Viáticos"),
    ]);

  if (!informe) notFound();

  const pagosPlanillaProyecto: PagoPlanillaProyecto[] = (pagosData ?? []).map((p) => ({
    descripcion: p.descripcion as string,
    fecha: p.fecha as string,
    monto: Number(p.monto),
  }));

  const gastosViaticosCajaMenuda: GastoViaticoCajaMenuda[] = (viaticosData ?? [])
    .filter((g) => g.concepto)
    .map((g) => ({
      concepto: g.concepto as string,
      fecha: g.fecha as string,
      monto: Number(g.monto),
    }));

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-green-900 dark:text-green-50">
        Editar informe de proyecto
      </h1>
      <ProyectoInformeForm
        fechaHoy={informe.fecha_desde as string}
        fechaHastaSugerida={informe.fecha_hasta as string}
        pagosPlanillaProyecto={pagosPlanillaProyecto}
        gastosViaticosCajaMenuda={gastosViaticosCajaMenuda}
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
