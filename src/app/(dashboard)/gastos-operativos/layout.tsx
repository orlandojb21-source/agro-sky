import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatMoney, formatDateOnly } from "@/lib/format";
import { GastosOperativosSubNav } from "@/components/layout/GastosOperativosSubNav";

// Días de anticipación para avisar que un gasto "Por pagar" tiene su
// fecha tope cerca -- fácil de ajustar si el usuario pide otro número
// más adelante.
const UMBRAL_DIAS_AVISO_PAGO = 7;

function aISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dia = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dia}`;
}

// Envoltorio para Caja Menuda + Gastos: pestañas + aviso de gastos "Por
// pagar" con fecha tope próxima o vencida (mismo estilo que "Es momento
// de reponer la caja" en (caja)/layout.tsx, visible en las 2 pestañas
// porque este layout envuelve a ambas). El resumen de saldo de caja (solo
// relevante para Caja Menuda) vive aparte, en el grupo de rutas (caja).
export default async function GastosOperativosLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const limite = new Date();
  limite.setDate(limite.getDate() + UMBRAL_DIAS_AVISO_PAGO);

  const { data: gastosPorPagar } = await supabase
    .from("gastos")
    .select("monto, fecha_tope_pago")
    .eq("estado_pago", "por_pagar")
    .not("fecha_tope_pago", "is", null)
    .lte("fecha_tope_pago", aISO(limite))
    .order("fecha_tope_pago", { ascending: true });

  const totalPendiente = (gastosPorPagar ?? []).reduce((s, g) => s + Number(g.monto), 0);
  const proximoTope = gastosPorPagar?.[0]?.fecha_tope_pago as string | undefined;

  return (
    <div className="flex flex-col gap-6">
      {gastosPorPagar && gastosPorPagar.length > 0 && (
        <Link
          href="/gastos-operativos/gastos"
          className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 shadow-sm transition hover:border-amber-300 dark:border-amber-900/40 dark:bg-amber-950/20"
        >
          <span className="text-2xl">⚠️</span>
          <div>
            <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
              {gastosPorPagar.length} gasto{gastosPorPagar.length > 1 ? "s" : ""} por pagar con fecha tope próxima o
              vencida
            </p>
            <p className="text-xs text-amber-700/80 dark:text-amber-400/80">
              Total pendiente: {formatMoney(totalPendiente)}
              {proximoTope ? ` — la más próxima: ${formatDateOnly(proximoTope)}` : ""}. Toca para ver el detalle.
            </p>
          </div>
        </Link>
      )}
      <GastosOperativosSubNav />
      {children}
    </div>
  );
}
