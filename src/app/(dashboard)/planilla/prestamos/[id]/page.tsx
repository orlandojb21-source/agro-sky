import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSection } from "@/lib/session";
import { canWrite } from "@/lib/roles";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/PageHeader";
import { LinkButton } from "@/components/ui/Button";
import { formatDateOnly, formatMoney } from "@/lib/format";

export default async function DetallePrestamoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const perfil = await requireSection("planilla");
  const puedeEscribir = canWrite(perfil.rol, "planilla");

  const supabase = await createClient();
  const [{ data: prestamo }, { data: abonosData }] = await Promise.all([
    supabase
      .from("prestamos")
      .select("id, colaborador, fecha, monto, cuota_quincenal, nota")
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("planilla_pagos")
      .select("fecha, descripcion, monto_prestamo")
      .eq("prestamo_id", id)
      .order("fecha", { ascending: true }),
  ]);

  if (!prestamo) notFound();

  const montoOriginal = Number(prestamo.monto);

  // El saldo pendiente no se guarda -- se calcula sumando los abonos ya
  // hechos (mismo criterio que calcularSaldoPrestamo en lib/prestamos.ts),
  // y de paso se arma el saldo despues de cada abono para el historial.
  const { abonos, saldoFinal } = (abonosData ?? []).reduce(
    (acc, a) => {
      const monto = Number(a.monto_prestamo ?? 0);
      const saldoDespues = Math.max(0, Math.round((acc.saldoFinal - monto) * 100) / 100);
      acc.abonos.push({ fecha: a.fecha as string, descripcion: a.descripcion as string, monto, saldoDespues });
      acc.saldoFinal = saldoDespues;
      return acc;
    },
    { abonos: [] as { fecha: string; descripcion: string; monto: number; saldoDespues: number }[], saldoFinal: montoOriginal },
  );
  const saldoPendiente = saldoFinal;
  const totalAbonado = Math.round((montoOriginal - saldoPendiente) * 100) / 100;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={`Préstamo de ${prestamo.colaborador as string}`}
        description="Historial de abonos y saldo pendiente."
        action={
          <div className="flex gap-3">
            {puedeEscribir && (
              <LinkButton href={`/planilla/prestamos/${id}/editar`} variant="secondary">
                Editar
              </LinkButton>
            )}
            <LinkButton href="/planilla/prestamos" variant="secondary">
              Volver a Préstamos
            </LinkButton>
          </div>
        }
      />

      <div className="grid grid-cols-2 gap-4 rounded-xl border border-green-100 bg-white p-6 shadow-sm sm:grid-cols-4 dark:border-green-900/40 dark:bg-green-950/10">
        <div>
          <p className="text-xs uppercase tracking-wide text-green-700/60 dark:text-green-300/60">
            Fecha del préstamo
          </p>
          <p className="mt-1 font-medium text-green-900 dark:text-green-50">
            {formatDateOnly(prestamo.fecha as string)}
          </p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-green-700/60 dark:text-green-300/60">Monto prestado</p>
          <p className="mt-1 font-medium text-green-900 dark:text-green-50">{formatMoney(montoOriginal)}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-green-700/60 dark:text-green-300/60">
            Cuota quincenal sugerida
          </p>
          <p className="mt-1 font-medium text-green-900 dark:text-green-50">
            {formatMoney(Number(prestamo.cuota_quincenal))}
          </p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-green-700/60 dark:text-green-300/60">
            Saldo pendiente
          </p>
          {saldoPendiente <= 0 ? (
            <span className="mt-1 inline-block rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800 dark:bg-green-900/40 dark:text-green-300">
              Pagado
            </span>
          ) : (
            <p className="mt-1 font-medium text-red-700 dark:text-red-400">{formatMoney(saldoPendiente)}</p>
          )}
        </div>
        {prestamo.nota && (
          <div className="col-span-2 sm:col-span-4">
            <p className="text-xs uppercase tracking-wide text-green-700/60 dark:text-green-300/60">Nota</p>
            <p className="mt-1 text-sm text-green-800/80 dark:text-green-200/80">{prestamo.nota as string}</p>
          </div>
        )}
      </div>

      <div>
        <h2 className="mb-3 text-lg font-semibold text-green-900 dark:text-green-50">
          Historial de abonos ({abonos.length})
        </h2>
        <p className="mb-3 text-sm text-green-700/70 dark:text-green-300/70">
          Total abonado: <span className="font-medium">{formatMoney(totalAbonado)}</span> de{" "}
          {formatMoney(montoOriginal)}
        </p>

        {abonos.length === 0 ? (
          <div className="rounded-xl border border-green-100 bg-white p-6 text-center text-sm text-green-700/70 shadow-sm dark:border-green-900/40 dark:bg-green-950/10 dark:text-green-200/70">
            Todavía no se ha descontado ningún abono de este préstamo.
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-green-100 bg-white shadow-sm dark:border-green-900/40 dark:bg-green-950/10">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] text-left text-sm">
                <thead>
                  <tr className="border-b border-green-100 bg-green-50 text-xs uppercase tracking-wide text-green-700 dark:border-green-900/40 dark:bg-green-950/30 dark:text-green-300">
                    <th className="px-4 py-2 font-medium">Fecha</th>
                    <th className="px-4 py-2 font-medium">Pago de planilla</th>
                    <th className="px-4 py-2 font-medium">Abono</th>
                    <th className="px-4 py-2 font-medium">Saldo después</th>
                  </tr>
                </thead>
                <tbody>
                  {abonos.map((a, i) => (
                    <tr
                      key={i}
                      className="border-b border-green-50 last:border-0 hover:bg-green-50/60 dark:border-green-900/30 dark:hover:bg-green-950/20"
                    >
                      <td className="px-4 py-3 text-green-800/80 dark:text-green-200/80">
                        {formatDateOnly(a.fecha)}
                      </td>
                      <td className="px-4 py-3 text-green-800/80 dark:text-green-200/80">{a.descripcion}</td>
                      <td className="px-4 py-3 font-medium text-green-900 dark:text-green-50">
                        {formatMoney(a.monto)}
                      </td>
                      <td className="px-4 py-3 text-green-800/80 dark:text-green-200/80">
                        {formatMoney(a.saldoDespues)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      <Link href="/planilla/prestamos" className="text-sm text-green-700 hover:underline dark:text-green-300">
        ← Volver a Préstamos
      </Link>
    </div>
  );
}
