"use client";

import { useActionState, useMemo, useState } from "react";
import { crearArqueoAction } from "@/lib/actions/caja";
import { Field } from "@/components/ui/Field";
import { FormError } from "@/components/ui/FormError";
import { SubmitButton, LinkButton } from "@/components/ui/Button";
import { DENOMINACIONES } from "@/lib/caja";
import { formatMoney } from "@/lib/format";

export function ArqueoForm({ fechaHoy, saldoEsperado }: { fechaHoy: string; saldoEsperado: number }) {
  const [state, formAction] = useActionState(crearArqueoAction, { error: null });

  const [prevState, setPrevState] = useState(state);
  const [remountKey, setRemountKey] = useState(0);
  if (state !== prevState) {
    setPrevState(state);
    setRemountKey((k) => k + 1);
  }

  const v = state.values;

  const [cantidades, setCantidades] = useState<Record<string, number>>(() =>
    Object.fromEntries(
      DENOMINACIONES.map((d) => [d.id, Number(v?.[`cantidad_${d.id}`] ?? 0) || 0]),
    ),
  );

  const totalContado = useMemo(
    () => DENOMINACIONES.reduce((suma, d) => suma + (cantidades[d.id] ?? 0) * d.valor, 0),
    [cantidades],
  );
  const diferencia = totalContado - saldoEsperado;

  const billetes = DENOMINACIONES.filter((d) => d.tipo === "billete");
  const monedas = DENOMINACIONES.filter((d) => d.tipo === "moneda");

  return (
    <form
      key={remountKey}
      action={formAction}
      className="flex max-w-2xl flex-col gap-4 rounded-xl border border-green-100 bg-white p-6 shadow-sm dark:border-green-900/40 dark:bg-green-950/10"
    >
      <FormError message={state.error} />

      <Field label="Fecha" name="fecha" type="date" defaultValue={v?.fecha ?? fechaHoy} required />

      <div>
        <p className="mb-2 text-sm font-medium text-green-900 dark:text-green-100">Billetes</p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {billetes.map((d) => (
            <label key={d.id} className="flex flex-col gap-1 text-sm text-green-900 dark:text-green-100">
              {d.label}
              <input
                name={`cantidad_${d.id}`}
                type="number"
                min={0}
                step={1}
                defaultValue={v?.[`cantidad_${d.id}`] ?? 0}
                onChange={(e) =>
                  setCantidades((c) => ({ ...c, [d.id]: Math.max(0, Math.trunc(Number(e.target.value) || 0)) }))
                }
                className="rounded-lg border border-green-200 bg-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-600 dark:border-green-800 dark:bg-green-950/30"
              />
            </label>
          ))}
        </div>
      </div>

      <div>
        <p className="mb-2 text-sm font-medium text-green-900 dark:text-green-100">Monedas</p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {monedas.map((d) => (
            <label key={d.id} className="flex flex-col gap-1 text-sm text-green-900 dark:text-green-100">
              {d.label}
              <input
                name={`cantidad_${d.id}`}
                type="number"
                min={0}
                step={1}
                defaultValue={v?.[`cantidad_${d.id}`] ?? 0}
                onChange={(e) =>
                  setCantidades((c) => ({ ...c, [d.id]: Math.max(0, Math.trunc(Number(e.target.value) || 0)) }))
                }
                className="rounded-lg border border-green-200 bg-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-600 dark:border-green-800 dark:bg-green-950/30"
              />
            </label>
          ))}
        </div>
      </div>

      <Field label="Nota (opcional)" name="nota" defaultValue={v?.nota} />

      <div className="rounded-lg border border-green-100 bg-green-50/60 p-4 text-sm dark:border-green-900/40 dark:bg-green-950/20">
        <div className="flex justify-between">
          <span className="text-green-800/80 dark:text-green-200/80">Total contado</span>
          <span className="font-medium text-green-900 dark:text-green-50">{formatMoney(totalContado)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-green-800/80 dark:text-green-200/80">Saldo esperado (según el sistema)</span>
          <span className="font-medium text-green-900 dark:text-green-50">{formatMoney(saldoEsperado)}</span>
        </div>
        <div className="mt-1 flex justify-between border-t border-green-200/60 pt-1 dark:border-green-800/60">
          <span className="text-green-800/80 dark:text-green-200/80">Diferencia</span>
          <span
            className={
              diferencia === 0
                ? "font-medium text-green-700 dark:text-green-400"
                : diferencia < 0
                  ? "font-medium text-red-700 dark:text-red-400"
                  : "font-medium text-amber-700 dark:text-amber-400"
            }
          >
            {formatMoney(diferencia)}
            {diferencia < 0 ? " (faltante)" : diferencia > 0 ? " (sobrante)" : " (cuadra)"}
          </span>
        </div>
      </div>

      <div className="flex gap-3">
        <SubmitButton>Guardar arqueo</SubmitButton>
        <LinkButton href="/caja-menuda/arqueos" variant="secondary">
          Cancelar
        </LinkButton>
      </div>
    </form>
  );
}
