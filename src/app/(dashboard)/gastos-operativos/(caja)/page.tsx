import { requireSection } from "@/lib/session";
import { canWrite } from "@/lib/roles";
import { createClient } from "@/lib/supabase/server";
import { obtenerCategoriasGasto } from "@/lib/categorias";
import { calcularSaldoActual } from "@/lib/caja";
import { PageHeader } from "@/components/ui/PageHeader";
import { LinkButton } from "@/components/ui/Button";
import { MovimientosTabla, type MovimientoFila } from "@/components/forms/MovimientosTabla";
import { BotonExportarDesdeReposicion } from "@/components/forms/BotonExportarDesdeReposicion";
import type { MovimientoExportable } from "@/lib/exportar";

export default async function CajaMenudaPage() {
  const perfil = await requireSection("gastos-operativos");
  const puedeEscribir = canWrite(perfil.rol, "gastos-operativos");

  const supabase = await createClient();
  const [{ data: gastos }, { data: reposiciones }, categorias, saldoActual] = await Promise.all([
    supabase
      .from("caja_gastos")
      .select(
        "id, fecha, categoria, nombre, numero_recibo, concepto, monto, colaborador, previsto, entregado, vuelto, nota",
      )
      .order("fecha", { ascending: false }),
    supabase
      .from("caja_reposiciones")
      .select("id, fecha, monto, nota")
      .order("fecha", { ascending: false }),
    obtenerCategoriasGasto(supabase, "caja_menuda"),
    calcularSaldoActual(supabase),
  ]);

  const movimientos: MovimientoFila[] = [
    ...(gastos ?? []).map((g) => ({
      id: g.id as string,
      tipo: "gasto" as const,
      fecha: g.fecha as string,
      categoria: g.categoria as string | null,
      monto: g.monto === null ? null : Number(g.monto),
      nombre: g.nombre as string | null,
      numeroRecibo: g.numero_recibo as string | null,
      concepto: g.concepto as string | null,
      colaborador: g.colaborador as string | null,
      previsto: g.previsto === null ? null : Number(g.previsto),
      entregado: g.entregado === null ? null : Number(g.entregado),
      vuelto: g.vuelto === null ? null : Number(g.vuelto),
      nota: g.nota as string | null,
    })),
    ...(reposiciones ?? []).map((r) => ({
      id: r.id as string,
      tipo: "reposicion" as const,
      fecha: r.fecha as string,
      categoria: null,
      monto: Number(r.monto),
      nombre: null,
      numeroRecibo: null,
      concepto: null,
      colaborador: null,
      previsto: null,
      entregado: null,
      vuelto: null,
      nota: r.nota as string | null,
    })),
  ].sort((a, b) => (a.fecha < b.fecha ? 1 : a.fecha > b.fecha ? -1 : 0));

  // Movimientos "desde la última reposición" (pedido del usuario,
  // 2026-08-17): reposiciones ya viene ordenado desc por fecha, así que la
  // primera fila es la más reciente. El corte es >= esa fecha (inclusive
  // -- si la reposición es hoy, los gastos de hoy en adelante ya cuentan
  // para el ciclo nuevo). El monto de cada gasto usa el mismo criterio que
  // el resto de la app para "gasto real" (entregado - vuelto, con
  // fallback a monto) en vez del campo monto crudo, que puede venir nulo.
  const ultimaReposicion = (reposiciones ?? [])[0] ?? null;
  const movimientosDesdeReposicion: MovimientoExportable[] = ultimaReposicion
    ? [
        {
          fecha: ultimaReposicion.fecha as string,
          tipo: "reposicion" as const,
          categoria: null,
          nombre: null,
          numeroRecibo: null,
          concepto: null,
          colaborador: null,
          previsto: null,
          entregado: null,
          vuelto: null,
          monto: Number(ultimaReposicion.monto),
          nota: ultimaReposicion.nota as string | null,
        },
        ...(gastos ?? [])
          .filter((g) => (g.fecha as string) >= (ultimaReposicion.fecha as string))
          .map((g) => ({
            fecha: g.fecha as string,
            tipo: "gasto" as const,
            categoria: g.categoria as string | null,
            nombre: g.nombre as string | null,
            numeroRecibo: g.numero_recibo as string | null,
            concepto: g.concepto as string | null,
            colaborador: g.colaborador as string | null,
            previsto: g.previsto === null ? null : Number(g.previsto),
            entregado: g.entregado === null ? null : Number(g.entregado),
            vuelto: g.vuelto === null ? null : Number(g.vuelto),
            monto: Number(g.entregado ?? g.monto ?? 0) - Number(g.vuelto ?? 0),
            nota: g.nota as string | null,
          })),
      ].sort((a, b) => (a.fecha < b.fecha ? 1 : a.fecha > b.fecha ? -1 : 0))
    : [];

  return (
    <div>
      <PageHeader
        title="Caja Menuda — Movimientos"
        action={
          <div className="flex flex-wrap gap-2">
            <BotonExportarDesdeReposicion
              movimientos={movimientosDesdeReposicion}
              fechaUltimaReposicion={ultimaReposicion ? (ultimaReposicion.fecha as string) : null}
              saldoActual={saldoActual}
            />
            {puedeEscribir && (
              <>
                <LinkButton href="/gastos-operativos/reposicion/nueva" variant="secondary">
                  + Reponer caja
                </LinkButton>
                <LinkButton href="/gastos-operativos/movimiento/nuevo">+ Registrar movimiento</LinkButton>
              </>
            )}
          </div>
        }
      />
      <MovimientosTabla movimientos={movimientos} puedeEscribir={puedeEscribir} categorias={categorias} />
    </div>
  );
}
