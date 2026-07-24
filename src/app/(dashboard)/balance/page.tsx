import { requireSection } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/PageHeader";
import {
  BalanceDashboard,
  type VentaBalance,
  type PagoPlanillaBalance,
} from "@/components/forms/BalanceDashboard";
import type { MovimientoExportable } from "@/lib/exportar";

export default async function BalancePage() {
  await requireSection("balance");

  const supabase = await createClient();
  const [{ data: gastos }, { data: reposiciones }, { data: ventasData }, { data: pagosData }] =
    await Promise.all([
      supabase
        .from("caja_gastos")
        .select("fecha, nombre, concepto, monto, colaborador, previsto, entregado, vuelto, nota")
        .order("fecha", { ascending: false }),
      supabase.from("caja_reposiciones").select("fecha, monto, nota").order("fecha", { ascending: false }),
      supabase
        .from("ventas")
        .select("fecha, subtotal_gravado, subtotal_exento, itbms")
        .order("fecha", { ascending: false }),
      supabase.from("planilla_pagos").select("fecha, colaborador, monto").order("fecha", { ascending: false }),
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

  const ventas: VentaBalance[] = (ventasData ?? []).map((v) => ({
    fecha: v.fecha as string,
    ingreso: Number(v.subtotal_gravado) + Number(v.subtotal_exento),
    itbms: Number(v.itbms),
  }));

  const pagosPlanilla: PagoPlanillaBalance[] = (pagosData ?? []).map((p) => ({
    fecha: p.fecha as string,
    colaborador: p.colaborador as string,
    monto: Number(p.monto),
  }));

  return (
    <div>
      <PageHeader
        title="Balance"
        description="Todo el dinero que entra y sale de Agro Sky: Ventas, Caja Menuda y Planilla. Cuando Compras esté listo, también aparecerá aquí."
      />
      <BalanceDashboard movimientos={movimientos} ventas={ventas} pagosPlanilla={pagosPlanilla} />
    </div>
  );
}
