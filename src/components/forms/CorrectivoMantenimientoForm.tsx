"use client";

import { useActionState, useState } from "react";
import { crearMantenimientoCorrectivoAction } from "@/lib/actions/dronesMantenimiento";
import { Field, SelectField } from "@/components/ui/Field";
import { FormError } from "@/components/ui/FormError";
import { SubmitButton, LinkButton } from "@/components/ui/Button";

export type DroneOpcionCorrectivo = { id: string; nombre: string; modelo: string };
export type ProductoOpcionCorrectivo = {
  id: string;
  numeroParte: string;
  descripcion: string;
  cantidad: number;
  tipo: "nuevo" | "usado";
};

type PiezaDraft = { productoId: string; cantidad: string };

function piezaVacia(): PiezaDraft {
  return { productoId: "", cantidad: "1" };
}

const CLASE_INPUT =
  "rounded-lg border border-green-200 bg-white px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-600 dark:border-green-800 dark:bg-green-950/30";

export function CorrectivoMantenimientoForm({
  drones,
  productos,
  fechaHoy,
  droneIdInicial,
}: {
  drones: DroneOpcionCorrectivo[];
  productos: ProductoOpcionCorrectivo[];
  fechaHoy: string;
  droneIdInicial?: string;
}) {
  const [state, formAction] = useActionState(crearMantenimientoCorrectivoAction, { error: null });

  const [droneId, setDroneId] = useState(droneIdInicial ?? drones[0]?.id ?? "");
  const [piezas, setPiezas] = useState<PiezaDraft[]>([piezaVacia()]);

  function agregarPieza() {
    setPiezas((prev) => [...prev, piezaVacia()]);
  }
  function quitarPieza(i: number) {
    setPiezas((prev) => prev.filter((_, idx) => idx !== i));
  }
  function actualizarPieza(i: number, campo: keyof PiezaDraft, valor: string) {
    setPiezas((prev) => prev.map((p, idx) => (idx === i ? { ...p, [campo]: valor } : p)));
  }

  const piezasParaEnviar = piezas
    .filter((p) => p.productoId)
    .map((p) => ({ productoId: p.productoId, cantidad: Number(p.cantidad) || 0 }));

  if (drones.length === 0) {
    return (
      <p className="text-sm text-green-700/70 dark:text-green-200/70">
        Todavía no hay drones registrados.{" "}
        <LinkButton href="/bitacora/nuevo" variant="secondary">
          Agregar drone
        </LinkButton>
      </p>
    );
  }

  return (
    <form action={formAction} className="flex max-w-2xl flex-col gap-6">
      <div className="flex flex-col gap-4 rounded-xl border border-green-100 bg-white p-6 shadow-sm dark:border-green-900/40 dark:bg-green-950/10">
        <FormError message={state.error} />
        <input type="hidden" name="piezas" value={JSON.stringify(piezasParaEnviar)} />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <SelectField
            label="Drone"
            name="droneId"
            value={droneId}
            onChange={(e) => setDroneId(e.target.value)}
            required
          >
            {drones.map((d) => (
              <option key={d.id} value={d.id}>
                {d.nombre} — {d.modelo}
              </option>
            ))}
          </SelectField>
          <Field label="Fecha" name="fecha" type="date" defaultValue={state.values?.fecha ?? fechaHoy} required />
        </div>

        <label className="flex flex-col gap-1 text-sm text-green-900 dark:text-green-100">
          Motivo
          <textarea
            name="motivo"
            rows={2}
            defaultValue={state.values?.motivo}
            placeholder="Ej: hélice trasera derecha rota en aterrizaje"
            className="rounded-lg border border-green-200 bg-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-600 dark:border-green-800 dark:bg-green-950/30"
            required
          />
        </label>
      </div>

      <div className="flex flex-col gap-3 rounded-xl border border-green-100 bg-white p-6 shadow-sm dark:border-green-900/40 dark:bg-green-950/10">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-green-700/80 dark:text-green-300/80">
          Piezas cambiadas
        </h2>
        <p className="-mt-1 text-xs text-green-700/60 dark:text-green-300/60">
          Cada pieza tiene que salir de un producto ya cargado en Inventario -- resta el stock automáticamente.
        </p>
        {productos.length === 0 ? (
          <p className="text-sm text-green-700/70 dark:text-green-200/70">
            Todavía no hay productos en Inventario.{" "}
            <LinkButton href="/inventario/nuevos/nuevo" variant="secondary">
              Agregar producto
            </LinkButton>
          </p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[420px] text-left text-sm">
                <thead>
                  <tr className="border-b border-green-100 text-xs uppercase tracking-wide text-green-700 dark:border-green-900/40 dark:text-green-300">
                    <th className="px-2 py-2 font-medium">Producto</th>
                    <th className="px-2 py-2 font-medium">Cantidad</th>
                    <th className="px-2 py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {piezas.map((p, i) => (
                    <tr key={i} className="border-b border-green-50 last:border-0 dark:border-green-900/30">
                      <td className="px-2 py-2">
                        <select
                          value={p.productoId}
                          onChange={(e) => actualizarPieza(i, "productoId", e.target.value)}
                          className={CLASE_INPUT}
                        >
                          <option value="">Selecciona...</option>
                          {productos.map((prod) => (
                            <option key={prod.id} value={prod.id}>
                              {prod.numeroParte} — {prod.descripcion} ({prod.tipo === "nuevo" ? "Nuevo" : "Usado"},
                              stock: {prod.cantidad})
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-2 py-2">
                        <input
                          type="number"
                          min={1}
                          step="1"
                          value={p.cantidad}
                          onChange={(e) => actualizarPieza(i, "cantidad", e.target.value)}
                          className={`${CLASE_INPUT} w-20`}
                        />
                      </td>
                      <td className="px-2 py-2">
                        <button
                          type="button"
                          onClick={() => quitarPieza(i)}
                          disabled={piezas.length === 1}
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
              onClick={agregarPieza}
              className="self-start rounded-lg border border-green-200 px-3 py-1.5 text-sm text-green-800 hover:bg-green-50 dark:border-green-800 dark:text-green-200 dark:hover:bg-green-950/40"
            >
              + Agregar pieza
            </button>
          </>
        )}
      </div>

      <div className="flex gap-3">
        <SubmitButton>Guardar mantenimiento</SubmitButton>
        <LinkButton href="/bitacora/mantenimiento" variant="secondary">
          Cancelar
        </LinkButton>
      </div>
    </form>
  );
}
