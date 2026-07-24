import { notFound } from "next/navigation";
import { requireSection } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { LinkButton } from "@/components/ui/Button";
import { formatMoney, formatDateOnly } from "@/lib/format";

export default async function DetalleVentaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await requireSection("ventas");

  const supabase = await createClient();
  const [{ data: venta }, { data: items }] = await Promise.all([
    supabase
      .from("ventas")
      .select(
        "id, fecha, cliente_nombre, cliente_documento, nota, subtotal_gravado, subtotal_exento, itbms, total",
      )
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("venta_items")
      .select("id, tipo, descripcion, cantidad, precio_unitario, aplica_itbms, subtotal")
      .eq("venta_id", id)
      .order("id"),
  ]);

  if (!venta) notFound();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-green-900 dark:text-green-50">
          Venta — {formatDateOnly(venta.fecha as string)}
        </h1>
        <LinkButton href="/ventas" variant="secondary">
          Volver
        </LinkButton>
      </div>

      <div className="grid grid-cols-1 gap-4 rounded-xl border border-green-100 bg-white p-6 shadow-sm sm:grid-cols-2 dark:border-green-900/40 dark:bg-green-950/10">
        <div>
          <p className="text-xs uppercase tracking-wide text-green-700/70 dark:text-green-300/70">
            Cliente
          </p>
          <p className="text-green-900 dark:text-green-50">{venta.cliente_nombre as string}</p>
        </div>
        {venta.cliente_documento ? (
          <div>
            <p className="text-xs uppercase tracking-wide text-green-700/70 dark:text-green-300/70">
              Cédula/RUC
            </p>
            <p className="text-green-900 dark:text-green-50">{venta.cliente_documento as string}</p>
          </div>
        ) : null}
        {venta.nota ? (
          <div className="sm:col-span-2">
            <p className="text-xs uppercase tracking-wide text-green-700/70 dark:text-green-300/70">
              Nota
            </p>
            <p className="text-green-900 dark:text-green-50">{venta.nota as string}</p>
          </div>
        ) : null}
      </div>

      <div className="overflow-hidden rounded-xl border border-green-100 bg-white shadow-sm dark:border-green-900/40 dark:bg-green-950/10">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px] text-left text-sm">
            <thead>
              <tr className="border-b border-green-100 bg-green-50 text-xs uppercase tracking-wide text-green-700 dark:border-green-900/40 dark:bg-green-950/30 dark:text-green-300">
                <th className="px-3 py-2 font-medium">Descripción</th>
                <th className="px-3 py-2 font-medium">Sección</th>
                <th className="px-3 py-2 font-medium">Cant.</th>
                <th className="px-3 py-2 font-medium">Precio unit.</th>
                <th className="px-3 py-2 font-medium">ITBMS</th>
                <th className="px-3 py-2 font-medium">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {(items ?? []).map((it) => (
                <tr
                  key={it.id as string}
                  className="border-b border-green-50 last:border-0 dark:border-green-900/30"
                >
                  <td className="px-3 py-3 text-green-900 dark:text-green-50">
                    {it.descripcion as string}
                  </td>
                  <td className="px-3 py-3 capitalize text-green-800/80 dark:text-green-200/80">
                    {it.tipo as string}
                  </td>
                  <td className="px-3 py-3 text-green-800/80 dark:text-green-200/80">
                    {it.cantidad as number}
                  </td>
                  <td className="px-3 py-3 text-green-800/80 dark:text-green-200/80">
                    {formatMoney(Number(it.precio_unitario))}
                  </td>
                  <td className="px-3 py-3 text-green-800/80 dark:text-green-200/80">
                    {it.aplica_itbms ? "7%" : "No aplica"}
                  </td>
                  <td className="px-3 py-3 font-medium text-green-900 dark:text-green-50">
                    {formatMoney(Number(it.subtotal))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="ml-auto flex w-full max-w-xs flex-col gap-1 rounded-lg border border-green-100 bg-green-50/60 p-4 text-sm dark:border-green-900/40 dark:bg-green-950/20">
        <div className="flex justify-between">
          <span className="text-green-800/80 dark:text-green-200/80">Subtotal gravado</span>
          <span className="text-green-900 dark:text-green-50">
            {formatMoney(Number(venta.subtotal_gravado))}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-green-800/80 dark:text-green-200/80">Subtotal exento</span>
          <span className="text-green-900 dark:text-green-50">
            {formatMoney(Number(venta.subtotal_exento))}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-green-800/80 dark:text-green-200/80">ITBMS (7%)</span>
          <span className="text-green-900 dark:text-green-50">{formatMoney(Number(venta.itbms))}</span>
        </div>
        <div className="mt-1 flex justify-between border-t border-green-200/60 pt-1 font-semibold dark:border-green-800/60">
          <span className="text-green-900 dark:text-green-50">Total</span>
          <span className="text-green-900 dark:text-green-50">{formatMoney(Number(venta.total))}</span>
        </div>
      </div>
    </div>
  );
}
