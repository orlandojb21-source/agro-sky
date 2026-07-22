"use client";

import { useMemo, useState } from "react";
import { DENOMINACIONES } from "@/lib/caja";
import { formatMoney } from "@/lib/format";

const CLASE_INPUT =
  "rounded-lg border border-green-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-600 dark:border-green-800 dark:bg-green-950/30";
const CLASE_INPUT_COMPACTO =
  "w-full rounded-md border border-green-200 bg-white px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-green-600 dark:border-green-800 dark:bg-green-950/30";

// Grilla reutilizable para marcar cuántos billetes/monedas de cada
// denominación entraron en un movimiento, en vez de escribir un solo total
// en dólares. Cada input se llama "{prefijo}_{id}" (ej. "monto_b20"); el
// servidor reconstruye el detalle y el total al guardar a partir de esos
// nombres (ver detalleDesdeFormData en lib/caja.ts).
export function DenominacionGrid({
  prefijo,
  valoresIniciales,
  compacto = false,
}: {
  prefijo: string;
  valoresIniciales?: Record<string, string | number | undefined>;
  compacto?: boolean;
}) {
  const [cantidades, setCantidades] = useState<Record<string, number>>(() =>
    Object.fromEntries(
      DENOMINACIONES.map((d) => [
        d.id,
        Math.max(0, Math.trunc(Number(valoresIniciales?.[`${prefijo}_${d.id}`] ?? 0) || 0)),
      ]),
    ),
  );

  const total = useMemo(
    () => DENOMINACIONES.reduce((suma, d) => suma + (cantidades[d.id] ?? 0) * d.valor, 0),
    [cantidades],
  );

  function actualizar(id: string, valor: string) {
    setCantidades((c) => ({ ...c, [id]: Math.max(0, Math.trunc(Number(valor) || 0)) }));
  }

  if (compacto) {
    return (
      <div className="flex flex-col gap-2">
        <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-6">
          {DENOMINACIONES.map((d) => (
            <label
              key={d.id}
              className="flex flex-col gap-0.5 text-[11px] text-green-900 dark:text-green-100"
            >
              {d.label}
              <input
                name={`${prefijo}_${d.id}`}
                type="number"
                min={0}
                step={1}
                inputMode="numeric"
                defaultValue={cantidades[d.id] || undefined}
                onChange={(e) => actualizar(d.id, e.target.value)}
                className={CLASE_INPUT_COMPACTO}
              />
            </label>
          ))}
        </div>
        <p className="text-right text-xs font-medium text-green-800 dark:text-green-200">
          Total: {formatMoney(total)}
        </p>
      </div>
    );
  }

  const billetes = DENOMINACIONES.filter((d) => d.tipo === "billete");
  const monedas = DENOMINACIONES.filter((d) => d.tipo === "moneda");

  return (
    <div className="flex flex-col gap-3">
      <div>
        <p className="mb-2 text-sm font-medium text-green-900 dark:text-green-100">Billetes</p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {billetes.map((d) => (
            <label
              key={d.id}
              className="flex flex-col gap-1 text-sm text-green-900 dark:text-green-100"
            >
              {d.label}
              <input
                name={`${prefijo}_${d.id}`}
                type="number"
                min={0}
                step={1}
                inputMode="numeric"
                defaultValue={cantidades[d.id] || undefined}
                onChange={(e) => actualizar(d.id, e.target.value)}
                className={CLASE_INPUT}
              />
            </label>
          ))}
        </div>
      </div>
      <div>
        <p className="mb-2 text-sm font-medium text-green-900 dark:text-green-100">Monedas</p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {monedas.map((d) => (
            <label
              key={d.id}
              className="flex flex-col gap-1 text-sm text-green-900 dark:text-green-100"
            >
              {d.label}
              <input
                name={`${prefijo}_${d.id}`}
                type="number"
                min={0}
                step={1}
                inputMode="numeric"
                defaultValue={cantidades[d.id] || undefined}
                onChange={(e) => actualizar(d.id, e.target.value)}
                className={CLASE_INPUT}
              />
            </label>
          ))}
        </div>
      </div>
      <p className="text-right text-sm font-medium text-green-800 dark:text-green-200">
        Total: {formatMoney(total)}
      </p>
    </div>
  );
}
