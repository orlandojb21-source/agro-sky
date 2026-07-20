import { requireSection } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/PageHeader";
import { LinkButton } from "@/components/ui/Button";
import { MovimientosTabla, type MovimientoFila } from "@/components/forms/MovimientosTabla";

export default async function CajaMenudaPage() {
  await requireSection("caja-menuda");

  const supabase = await createClient();
  const [{ data: gastos }, { data: reposiciones }] = await Promise.all([
    supabase
      .from("caja_gastos")
      .select("id, fecha, nombre, concepto, monto, colaborador, nota")
      .order("fecha", { ascending: false }),
    supabase
      .from("caja_reposiciones")
      .select("id, fecha, monto, nota")
      .order("fecha", { ascending: false }),
  ]);

  const movimientos: MovimientoFila[] = [
    ...(gastos ?? []).map((g) => ({
      id: g.id as string,
      tipo: "gasto" as const,
      fecha: g.fecha as string,
      monto: Number(g.monto),
      nombre: g.nombre as string | null,
      concepto: g.concepto as string | null,
      colaborador: g.colaborador as string | null,
      nota: g.nota as string | null,
    })),
    ...(reposiciones ?? []).map((r) => ({
      id: r.id as string,
      tipo: "reposicion" as const,
      fecha: r.fecha as string,
      monto: Number(r.monto),
      nombre: null,
      concepto: null,
      colaborador: null,
      nota: r.nota as string | null,
    })),
  ].sort((a, b) => (a.fecha < b.fecha ? 1 : a.fecha > b.fecha ? -1 : 0));

  return (
    <div>
      <PageHeader
        title="Caja Menuda — Movimientos"
        action={
          <div className="flex gap-2">
            <LinkButton href="/caja-menuda/reposicion/nueva" variant="secondary">
              + Reponer caja
            </LinkButton>
            <LinkButton href="/caja-menuda/gasto/nuevo">+ Registrar gasto</LinkButton>
          </div>
        }
      />
      <MovimientosTabla movimientos={movimientos} />
    </div>
  );
}
