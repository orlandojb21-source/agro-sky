"use client";

import { useActionState, useState } from "react";
import { agregarDiaInformeCampoAction } from "@/lib/actions/informesCampo";
import { Field, SelectField } from "@/components/ui/Field";
import { FormError } from "@/components/ui/FormError";
import { SubmitButton, LinkButton } from "@/components/ui/Button";

const CLASE_INPUT =
  "w-full rounded-lg border border-green-200 bg-white px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-600 dark:border-green-800 dark:bg-green-950/30";

type ParcelaDraft = { numeroParcela: string; hectareas: string };

function parcelaVacia(): ParcelaDraft {
  return { numeroParcela: "", hectareas: "" };
}

// Formulario para agregar UN día más de trabajo a un Informe de Campo
// Particular que sigue "Abierto" (ver migración 0085) -- versión
// recortada de InformeCampoForm.tsx: mismo patrón de operador/ayudantes/
// parcelas, pero sin encabezado del cliente/finca/firmas (eso ya vive en
// el informe, no cambia día a día).
export function AgregarDiaInformeCampoForm({
  informeId,
  fechaHoy,
  colaboradoresCampo,
  operadorSugerido,
}: {
  informeId: string;
  fechaHoy: string;
  colaboradoresCampo: string[];
  operadorSugerido: string;
}) {
  const [state, formAction] = useActionState(agregarDiaInformeCampoAction, { error: null });
  const v = state.values;

  const [operador, setOperador] = useState(v?.operador ?? operadorSugerido);
  const [ayudantes, setAyudantes] = useState<string[]>(() => {
    if (v?.ayudantes) {
      try {
        return JSON.parse(v.ayudantes) as string[];
      } catch {
        // sigue abajo
      }
    }
    return [];
  });
  const [parcelas, setParcelas] = useState<ParcelaDraft[]>(() => {
    if (v?.parcelas) {
      try {
        const parsed = JSON.parse(v.parcelas) as { numeroParcela: string; hectareas: number }[];
        if (parsed.length > 0) {
          return parsed.map((p) => ({ numeroParcela: p.numeroParcela, hectareas: String(p.hectareas) }));
        }
      } catch {
        // sigue abajo
      }
    }
    return [parcelaVacia()];
  });

  function agregarAyudante() {
    setAyudantes((prev) => [...prev, ""]);
  }
  function actualizarAyudante(i: number, valor: string) {
    setAyudantes((prev) => prev.map((a, idx) => (idx === i ? valor : a)));
  }
  function quitarAyudante(i: number) {
    setAyudantes((prev) => prev.filter((_, idx) => idx !== i));
  }
  function actualizarParcela(i: number, campo: keyof ParcelaDraft, valor: string) {
    setParcelas((prev) => prev.map((p, idx) => (idx === i ? { ...p, [campo]: valor } : p)));
  }
  function agregarParcela() {
    setParcelas((prev) => [...prev, parcelaVacia()]);
  }
  function quitarParcela(i: number) {
    setParcelas((prev) => (prev.length > 1 ? prev.filter((_, idx) => idx !== i) : prev));
  }

  const ayudantesParaEnviar = ayudantes.map((a) => a.trim()).filter((a) => a !== "");
  const parcelasParaEnviar = parcelas.map((p) => ({
    numeroParcela: p.numeroParcela,
    hectareas: Number(p.hectareas) || 0,
  }));

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <FormError message={state.error} />
      <input type="hidden" name="informeId" value={informeId} />
      <input type="hidden" name="ayudantes" value={JSON.stringify(ayudantesParaEnviar)} />
      <input type="hidden" name="parcelas" value={JSON.stringify(parcelasParaEnviar)} />

      <div className="grid max-w-2xl grid-cols-1 gap-4 rounded-xl border border-green-100 bg-white p-6 shadow-sm sm:grid-cols-2 dark:border-green-900/40 dark:bg-green-950/10">
        <Field
          label="Fecha de trabajo"
          name="fecha"
          type="date"
          defaultValue={v?.fecha ?? fechaHoy}
          required
        />
        <SelectField label="Jornada" name="jornada" defaultValue={v?.jornada ?? "completo"} required>
          <option value="completo">Día completo</option>
          <option value="medio">Medio día</option>
        </SelectField>
        <Field
          label="Hora de inicio"
          name="horaInicio"
          type="time"
          defaultValue={v?.horaInicio ?? undefined}
          required
        />
        <Field
          label="Hora de finalización"
          name="horaFin"
          type="time"
          defaultValue={v?.horaFin ?? undefined}
          required
        />
      </div>

      <div className="flex flex-col gap-3 rounded-xl border border-green-100 bg-white p-6 shadow-sm dark:border-green-900/40 dark:bg-green-950/10">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-green-700/80 dark:text-green-300/80">
          Equipo de Campo
        </h2>
        <div className="flex flex-wrap items-end gap-3">
          <SelectField
            label="Operador"
            name="operador"
            value={operador}
            onChange={(e) => setOperador(e.target.value)}
            required
          >
            <option value="">Selecciona...</option>
            {colaboradoresCampo.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </SelectField>
          {ayudantes.map((ayudante, i) => (
            <div key={i} className="flex items-end gap-1">
              <SelectField
                label={`Ayudante ${i + 1}`}
                name={`ayudante-${i}`}
                defaultValue={ayudante}
                onChange={(e) => actualizarAyudante(i, e.target.value)}
              >
                <option value="">Selecciona...</option>
                {colaboradoresCampo.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </SelectField>
              <button
                type="button"
                onClick={() => quitarAyudante(i)}
                className="pb-2 text-sm text-red-600 hover:underline dark:text-red-400"
              >
                Quitar
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={agregarAyudante}
          className="self-start rounded-lg border border-green-200 px-3 py-1 text-xs text-green-800 hover:bg-green-50 dark:border-green-800 dark:text-green-200 dark:hover:bg-green-950/40"
        >
          + Agregar ayudante
        </button>
      </div>

      <div className="flex flex-col gap-4 rounded-xl border border-green-100 bg-white p-6 shadow-sm dark:border-green-900/40 dark:bg-green-950/10">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-green-700/80 dark:text-green-300/80">
          Parcelas de este día
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[360px] text-left text-sm">
            <thead>
              <tr className="border-b border-green-100 text-xs uppercase tracking-wide text-green-700 dark:border-green-900/40 dark:text-green-300">
                <th className="px-2 py-2 font-medium">Parcela #</th>
                <th className="px-2 py-2 font-medium">Hectáreas</th>
                <th className="px-2 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {parcelas.map((p, i) => (
                <tr key={i} className="border-b border-green-50 last:border-0 dark:border-green-900/30">
                  <td className="px-2 py-2">
                    <input
                      value={p.numeroParcela}
                      onChange={(e) => actualizarParcela(i, "numeroParcela", e.target.value)}
                      className={CLASE_INPUT}
                    />
                  </td>
                  <td className="px-2 py-2">
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      value={p.hectareas}
                      onChange={(e) => actualizarParcela(i, "hectareas", e.target.value)}
                      className={CLASE_INPUT}
                    />
                  </td>
                  <td className="px-2 py-2">
                    <button
                      type="button"
                      onClick={() => quitarParcela(i)}
                      disabled={parcelas.length === 1}
                      className="text-sm text-red-600 hover:underline disabled:opacity-30 dark:text-red-400"
                    >
                      Quitar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <button
          type="button"
          onClick={agregarParcela}
          className="self-start rounded-lg border border-green-200 px-3 py-1.5 text-sm text-green-800 hover:bg-green-50 dark:border-green-800 dark:text-green-200 dark:hover:bg-green-950/40"
        >
          + Agregar parcela
        </button>
      </div>

      <div className="flex gap-3">
        <SubmitButton>Agregar día</SubmitButton>
        <LinkButton href={`/informes/campo/${informeId}`} variant="secondary">
          Cancelar
        </LinkButton>
      </div>
    </form>
  );
}
