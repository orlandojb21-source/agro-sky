import { createClient } from "@/lib/supabase/server";
import { VentasSubNav } from "@/components/layout/VentasSubNav";
import { formatMoney } from "@/lib/format";

export default async function VentasLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const hoy = new Date().toISOString().slice(0, 10);

  const { data } = await supabase
    .from("ventas")
    .select("id, total, fecha_vencimiento")
    .eq("estado_pago", "pendiente");

  const pendientes = data ?? [];
  const totalPorCobrar = pendientes.reduce((suma, v) => suma + Number(v.total), 0);
  const vencidas = pendientes.filter(
    (v) => v.fecha_vencimiento && (v.fecha_vencimiento as string) < hoy,
  );

  return (
    <div className="flex flex-col gap-6">
      {pendientes.length > 0 && (
        <div
          className={`flex items-center gap-3 rounded-xl border p-4 shadow-sm ${
            vencidas.length > 0
              ? "border-red-200 bg-red-50 dark:border-red-900/40 dark:bg-red-950/20"
              : "border-amber-200 bg-amber-50 dark:border-amber-900/40 dark:bg-amber-950/20"
          }`}
        >
          <span className="text-2xl">{vencidas.length > 0 ? "🔴" : "⚠️"}</span>
          <div>
            <p
              className={`text-sm font-medium ${
                vencidas.length > 0
                  ? "text-red-800 dark:text-red-300"
                  : "text-amber-800 dark:text-amber-300"
              }`}
            >
              {pendientes.length} factura{pendientes.length === 1 ? "" : "s"} por cobrar (
              {formatMoney(totalPorCobrar)})
              {vencidas.length > 0
                ? ` — ${vencidas.length} vencida${vencidas.length === 1 ? "" : "s"}`
                : ""}
            </p>
            <p
              className={`text-xs ${
                vencidas.length > 0
                  ? "text-red-700/80 dark:text-red-400/80"
                  : "text-amber-700/80 dark:text-amber-400/80"
              }`}
            >
              Revisa la lista de Ventas para ver el detalle y marcarlas como cobradas.
            </p>
          </div>
        </div>
      )}

      <VentasSubNav />
      {children}
    </div>
  );
}
