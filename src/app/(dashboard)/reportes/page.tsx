import { requireSection } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/PageHeader";
import { ReportesFiltro } from "@/components/forms/ReportesFiltro";
import type { MovimientoExportable } from "@/lib/exportar";

export default async function ReportesPage() {
  await requireSection("reportes");

  const supabase = await createClient();
  const [{ data: gastos }, { data: reposiciones }] = await Promise.all([
    supabase
      .from("caja_gastos")
      .select("fecha, nombre, concepto, monto, colaborador, previsto, entregado, vuelto, nota")
      .order("fecha", { ascending: false }),
    supabase.from("caja_reposiciones").select("fecha, monto, nota").order("fecha", { ascending: false }),
  ]);

  const movimientos: MovimientoExportable[] = [
    ...(gastos ?? []).map((g) => ({
      fecha: g.fecha as string,
      tipo: "gasto" as const,
      nombre: g.nombre as string | null,
      concepto: g.concepto as string | null,
      colaborador: g.colaborador as string | null,
      previsto: g.previsto === null ? null : Number(g.previsto),
      entregado: g.entregado === null ? null : Number(g.entregado),
      vuelto: g.vuelto === null ? null : Number(g.vuelto),
      monto: Number(g.entregado ?? g.monto ?? 0),
      nota: g.nota as string | null,
    })),
    ...(reposiciones ?? []).map((r) => ({
      fecha: r.fecha as string,
      tipo: "reposicion" as const,
      nombre: null,
      concepto: null,
      colaborador: null,
      previsto: null,
      entregado: null,
      vuelto: null,
      monto: Number(r.monto),
      nota: r.nota as string | null,
    })),
  ];

  return (
    <div>
      <PageHeader
        title="Reportes de Caja Menuda"
        description="Exporta los movimientos de Caja Menuda por período. Cuando Compras y Ventas estén listos, aquí también se podrán exportar Ingresos, Egresos y Ganancias."
      />
      <ReportesFiltro movimientos={movimientos} />
    </div>
  );
}
