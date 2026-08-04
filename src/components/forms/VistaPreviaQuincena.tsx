import { formatMoney } from "@/lib/format";

// Solo la ve el rol "jefe" (ver la nota en planilla/page.tsx) -- un
// estimado de lo que va acumulando el pago de Campo en la quincena que
// está corriendo, calculado con la misma fórmula que "Calcular pago
// sugerido" (lib/calculoIncentivos.ts) a partir de la Asistencia ya
// marcada. Es solo una proyección: el monto real de cada pago se
// registra aparte, en Pagos, y puede editarse a mano ahí.
export function VistaPreviaQuincena({
  etiquetaQuincena,
  porColaborador,
}: {
  etiquetaQuincena: string;
  porColaborador: { colaborador: string; total: number }[];
}) {
  const totalGeneral = porColaborador.reduce((s, c) => s + c.total, 0);

  return (
    <div className="rounded-xl border border-green-100 bg-white p-4 shadow-sm dark:border-green-900/40 dark:bg-green-950/10">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-green-700/80 dark:text-green-300/80">
        Vista previa de la quincena en curso ({etiquetaQuincena})
      </h2>
      <p className="mt-1 text-xs text-green-700/60 dark:text-green-300/60">
        Estimado de Campo según la Asistencia marcada hasta hoy -- no es el pago final.
      </p>

      {porColaborador.length === 0 ? (
        <p className="mt-3 text-sm text-green-700/70 dark:text-green-300/70">
          Todavía no hay Asistencia registrada para esta quincena.
        </p>
      ) : (
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-max text-left text-sm">
            <thead>
              <tr className="border-b border-green-100 text-xs uppercase tracking-wide text-green-700/70 dark:border-green-900/40 dark:text-green-300/70">
                <th className="py-2 pr-4 font-medium">Colaborador</th>
                <th className="py-2 pr-4 font-medium">Proyectado</th>
              </tr>
            </thead>
            <tbody>
              {porColaborador.map((c) => (
                <tr key={c.colaborador} className="border-b border-green-50 last:border-0 dark:border-green-900/30">
                  <td className="py-2 pr-4 text-green-900 dark:text-green-50">{c.colaborador}</td>
                  <td className="py-2 pr-4 text-green-900 dark:text-green-50">{formatMoney(c.total)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td className="pt-2 pr-4 font-semibold text-green-900 dark:text-green-50">Total proyectado</td>
                <td className="pt-2 pr-4 font-semibold text-green-900 dark:text-green-50">
                  {formatMoney(totalGeneral)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}
