"use client";

import { ROLES_PERSONAL, type RolPersonal } from "@/lib/proyectos";
import { formatMoney, formatDateOnly } from "@/lib/format";

export type PersonalDiaDraft = { fecha: string; monto: number };
export type PersonalDraft = { nombre: string; rol: RolPersonal; dias: PersonalDiaDraft[] };

const CLASE_INPUT =
  "rounded-lg border border-green-200 bg-white px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-600 dark:border-green-800 dark:bg-green-950/30";

// Fechas "YYYY-MM-DD" avanzadas con getters/setters UTC (no horario local)
// para no correr un dia por el desfase de zona horaria -- mismo motivo que
// formatDateOnly() en lib/format.ts.
function diasDelRango(fechaDesde: string, fechaHasta: string): string[] {
  if (!fechaDesde || !fechaHasta || fechaHasta < fechaDesde) return [];
  const dias: string[] = [];
  const cursor = new Date(`${fechaDesde}T00:00:00Z`);
  const fin = new Date(`${fechaHasta}T00:00:00Z`);
  let guarda = 0;
  while (cursor <= fin && guarda < 31) {
    dias.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
    guarda += 1;
  }
  return dias;
}

// Apendice de pago diario por persona (Operador/Ayudante) dentro de la
// semana del informe -- es solo detalle de respaldo, no entra en el
// calculo de ganancia de las operaciones (ver proyecto_personal_dias en la
// migracion 0022).
export function PersonalDiasGrid({
  fechaDesde,
  fechaHasta,
  personal,
  onChange,
}: {
  fechaDesde: string;
  fechaHasta: string;
  personal: PersonalDraft[];
  onChange: (next: PersonalDraft[]) => void;
}) {
  const dias = diasDelRango(fechaDesde, fechaHasta);

  function agregarPersona() {
    onChange([...personal, { nombre: "", rol: "Operador", dias: [] }]);
  }

  function quitarPersona(index: number) {
    onChange(personal.filter((_, i) => i !== index));
  }

  function actualizarPersona(index: number, cambios: Partial<PersonalDraft>) {
    onChange(personal.map((p, i) => (i === index ? { ...p, ...cambios } : p)));
  }

  function montoDelDia(persona: PersonalDraft, fecha: string): number {
    return persona.dias.find((d) => d.fecha === fecha)?.monto ?? 0;
  }

  function actualizarMontoDia(index: number, fecha: string, monto: number) {
    const persona = personal[index];
    const otros = persona.dias.filter((d) => d.fecha !== fecha);
    actualizarPersona(index, { dias: monto > 0 ? [...otros, { fecha, monto }] : otros });
  }

  const totalPersonal = personal.reduce((suma, p) => suma + p.dias.reduce((s, d) => s + d.monto, 0), 0);

  if (dias.length === 0) {
    return (
      <p className="text-sm text-green-700/70 dark:text-green-300/70">
        Completa la fecha Desde y Hasta del informe para poder registrar el pago diario.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[700px] text-left text-sm">
          <thead>
            <tr className="border-b border-green-100 text-xs uppercase tracking-wide text-green-700 dark:border-green-900/40 dark:text-green-300">
              <th className="px-2 py-2 font-medium">Nombre</th>
              <th className="px-2 py-2 font-medium">Rol</th>
              {dias.map((f) => (
                <th key={f} className="whitespace-nowrap px-2 py-2 font-medium">
                  {formatDateOnly(f)}
                </th>
              ))}
              <th className="px-2 py-2 font-medium">Total</th>
              <th className="px-2 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {personal.map((p, i) => {
              const totalPersona = p.dias.reduce((s, d) => s + d.monto, 0);
              return (
                <tr key={i} className="border-b border-green-50 last:border-0 dark:border-green-900/30">
                  <td className="px-2 py-2">
                    <input
                      value={p.nombre}
                      onChange={(e) => actualizarPersona(i, { nombre: e.target.value })}
                      placeholder="Nombre"
                      className={`${CLASE_INPUT} w-32`}
                    />
                  </td>
                  <td className="px-2 py-2">
                    <select
                      value={p.rol}
                      onChange={(e) => actualizarPersona(i, { rol: e.target.value as RolPersonal })}
                      className={CLASE_INPUT}
                    >
                      {ROLES_PERSONAL.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                  </td>
                  {dias.map((f) => (
                    <td key={f} className="px-2 py-2">
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        value={montoDelDia(p, f) || ""}
                        onChange={(e) => actualizarMontoDia(i, f, Number(e.target.value) || 0)}
                        className={`${CLASE_INPUT} w-20`}
                      />
                    </td>
                  ))}
                  <td className="px-2 py-2 font-medium text-green-900 dark:text-green-50">
                    {formatMoney(totalPersona)}
                  </td>
                  <td className="px-2 py-2">
                    <button
                      type="button"
                      onClick={() => quitarPersona(i)}
                      className="text-sm text-red-600 hover:underline dark:text-red-400"
                    >
                      Quitar
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {personal.length > 0 && (
        <p className="text-sm text-green-800/80 dark:text-green-200/80">
          Total personal por día: {formatMoney(totalPersonal)}
        </p>
      )}

      <button
        type="button"
        onClick={agregarPersona}
        className="w-fit rounded-lg border border-green-200 px-3 py-1.5 text-sm text-green-800 hover:bg-green-50 dark:border-green-800 dark:text-green-200 dark:hover:bg-green-950/40"
      >
        + Agregar persona
      </button>
    </div>
  );
}
