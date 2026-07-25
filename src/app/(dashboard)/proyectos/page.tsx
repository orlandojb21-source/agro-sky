import { requireSection } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/PageHeader";
import { LinkButton } from "@/components/ui/Button";
import { ProyectoInformesTabla, type InformeProyectoFila } from "@/components/forms/ProyectoInformesTabla";

type TramoFila = { hectareas: number; precio: number };
type OperacionFila = {
  diesel: number;
  gasolina: number;
  viaticos: number;
  planilla: number;
  alquiler_drone: number;
  alquiler_carro: number;
  lavado_carro: number;
  proyecto_tramos: TramoFila[] | null;
};

export default async function ProyectosPage() {
  await requireSection("proyectos");

  const supabase = await createClient();
  const { data } = await supabase
    .from("proyecto_informes")
    .select(
      `id, proyecto, ubicacion, fecha_desde, fecha_hasta,
       proyecto_operaciones (
         diesel, gasolina, viaticos, planilla, alquiler_drone, alquiler_carro, lavado_carro,
         proyecto_tramos ( hectareas, precio )
       )`,
    )
    .order("fecha_desde", { ascending: false });

  const informes: InformeProyectoFila[] = (data ?? []).map((row) => {
    const operaciones = (row.proyecto_operaciones ?? []) as unknown as OperacionFila[];
    let hectareas = 0;
    let monto = 0;
    let gastos = 0;
    for (const op of operaciones) {
      gastos +=
        Number(op.diesel) +
        Number(op.gasolina) +
        Number(op.viaticos) +
        Number(op.planilla) +
        Number(op.alquiler_drone) +
        Number(op.alquiler_carro) +
        Number(op.lavado_carro);
      for (const tramo of op.proyecto_tramos ?? []) {
        hectareas += Number(tramo.hectareas);
        monto += Number(tramo.hectareas) * Number(tramo.precio);
      }
    }
    return {
      id: row.id as string,
      proyecto: row.proyecto as string,
      ubicacion: row.ubicacion as string | null,
      fechaDesde: row.fecha_desde as string,
      fechaHasta: row.fecha_hasta as string,
      hectareas: Math.round(hectareas * 100) / 100,
      monto,
      gastos,
      ganancia: monto - gastos,
    };
  });

  return (
    <div>
      <PageHeader
        title="Proyectos"
        description="Informe semanal de costos y ganancia por trabajo. No son ventas ni facturas -- es solo un análisis interno."
        action={<LinkButton href="/proyectos/nuevo">+ Nuevo informe</LinkButton>}
      />
      <ProyectoInformesTabla informes={informes} />
    </div>
  );
}
