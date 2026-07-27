"use client";

import { useActionState, useState } from "react";
import { crearSolicitudAction } from "@/lib/actions/compras";
import { Field } from "@/components/ui/Field";
import { FormError } from "@/components/ui/FormError";
import { SubmitButton, LinkButton } from "@/components/ui/Button";

const CLASE_INPUT =
  "rounded-lg border border-green-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-600 dark:border-green-800 dark:bg-green-950/30";

export type CatalogoProductoCompra = {
  id: string;
  numeroParte: string;
  descripcion: string;
  cantidad: number;
};

type Tipo = "nuevo" | "usado";

type ItemSolicitud = {
  productoId: string;
  tipo: Tipo;
  numeroParte: string;
  descripcion: string;
  cantidadActual: number;
  cantidadSolicitada: number;
};

export function SolicitudCompraForm({
  fechaHoy,
  productosNuevos,
  productosUsados,
}: {
  fechaHoy: string;
  productosNuevos: CatalogoProductoCompra[];
  productosUsados: CatalogoProductoCompra[];
}) {
  const [state, formAction] = useActionState(crearSolicitudAction, { error: null });

  const [prevState, setPrevState] = useState(state);
  const [remountKey, setRemountKey] = useState(0);
  if (state !== prevState) {
    setPrevState(state);
    setRemountKey((k) => k + 1);
  }

  const v = state.values;

  const [items, setItems] = useState<ItemSolicitud[]>(() => {
    if (!v?.items) return [];
    try {
      return JSON.parse(v.items) as ItemSolicitud[];
    } catch {
      return [];
    }
  });

  const [tipoDraft, setTipoDraft] = useState<Tipo>("nuevo");
  const [idDraft, setIdDraft] = useState("");
  const [cantidadDraft, setCantidadDraft] = useState("1");

  const catalogoActivo = tipoDraft === "nuevo" ? productosNuevos : productosUsados;
  const yaEnCarrito = new Set(items.map((it) => it.productoId));
  const itemSeleccionado = catalogoActivo.find((c) => c.id === idDraft);
  const cantidadDraftNum = Number(cantidadDraft) || 0;

  function agregarItem() {
    if (!itemSeleccionado || yaEnCarrito.has(itemSeleccionado.id)) return;
    if (!cantidadDraftNum || cantidadDraftNum <= 0) return;

    setItems((prev) => [
      ...prev,
      {
        productoId: itemSeleccionado.id,
        tipo: tipoDraft,
        numeroParte: itemSeleccionado.numeroParte,
        descripcion: itemSeleccionado.descripcion,
        cantidadActual: itemSeleccionado.cantidad,
        cantidadSolicitada: cantidadDraftNum,
      },
    ]);

    setIdDraft("");
    setCantidadDraft("1");
  }

  function quitarItem(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }

  return (
    <form key={remountKey} action={formAction} className="flex flex-col gap-6">
      <FormError message={state.error} />
      <input type="hidden" name="items" value={JSON.stringify(items)} />

      <div className="flex max-w-2xl flex-col gap-4 rounded-xl border border-green-100 bg-white p-6 shadow-sm dark:border-green-900/40 dark:bg-green-950/10">
        <Field label="Fecha" name="fecha" type="date" defaultValue={v?.fecha ?? fechaHoy} required />
        <Field label="Nota (opcional)" name="nota" defaultValue={v?.nota ?? undefined} />
      </div>

      <div className="flex flex-col gap-4 rounded-xl border border-green-100 bg-white p-6 shadow-sm dark:border-green-900/40 dark:bg-green-950/10">
        <h2 className="text-lg font-semibold text-green-900 dark:text-green-50">
          Agregar productos a reponer
        </h2>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:items-end">
          <label className="flex flex-col gap-1 text-sm text-green-900 dark:text-green-100">
            Sección
            <select
              value={tipoDraft}
              onChange={(e) => {
                setTipoDraft(e.target.value as Tipo);
                setIdDraft("");
              }}
              className={CLASE_INPUT}
            >
              <option value="nuevo">Nuevo</option>
              <option value="usado">Usado</option>
            </select>
          </label>

          <label className="col-span-2 flex flex-col gap-1 text-sm text-green-900 dark:text-green-100 sm:col-span-1">
            Producto
            <select
              value={idDraft}
              onChange={(e) => setIdDraft(e.target.value)}
              className={CLASE_INPUT}
            >
              <option value="">Selecciona...</option>
              {catalogoActivo.map((c) => (
                <option key={c.id} value={c.id} disabled={yaEnCarrito.has(c.id)}>
                  {c.numeroParte} — {c.descripcion} (stock: {c.cantidad})
                  {yaEnCarrito.has(c.id) ? " — ya en la lista" : ""}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1 text-sm text-green-900 dark:text-green-100">
            Cantidad a pedir
            <input
              type="number"
              min={1}
              step="1"
              value={cantidadDraft}
              onChange={(e) => setCantidadDraft(e.target.value)}
              className={CLASE_INPUT}
            />
          </label>

          <button
            type="button"
            onClick={agregarItem}
            disabled={!itemSeleccionado || yaEnCarrito.has(itemSeleccionado.id) || !cantidadDraftNum}
            className="rounded-lg bg-gradient-to-r from-green-600 to-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:opacity-90 disabled:opacity-40"
          >
            + Agregar
          </button>
        </div>

        {items.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead>
                <tr className="border-b border-green-100 text-xs uppercase tracking-wide text-green-700 dark:border-green-900/40 dark:text-green-300">
                  <th className="px-2 py-2 font-medium">Código</th>
                  <th className="px-2 py-2 font-medium">Descripción</th>
                  <th className="px-2 py-2 font-medium">Sección</th>
                  <th className="px-2 py-2 font-medium">Stock actual</th>
                  <th className="px-2 py-2 font-medium">Cantidad a pedir</th>
                  <th className="px-2 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {items.map((it, i) => (
                  <tr key={i} className="border-b border-green-50 last:border-0 dark:border-green-900/30">
                    <td className="px-2 py-2 text-green-900 dark:text-green-50">{it.numeroParte}</td>
                    <td className="px-2 py-2 text-green-800/80 dark:text-green-200/80">
                      {it.descripcion || "—"}
                    </td>
                    <td className="px-2 py-2 capitalize text-green-800/80 dark:text-green-200/80">
                      {it.tipo}
                    </td>
                    <td className="px-2 py-2 text-green-800/80 dark:text-green-200/80">
                      {it.cantidadActual}
                    </td>
                    <td className="px-2 py-2 font-medium text-green-900 dark:text-green-50">
                      {it.cantidadSolicitada}
                    </td>
                    <td className="px-2 py-2">
                      <button
                        type="button"
                        onClick={() => quitarItem(i)}
                        className="text-sm text-red-600 hover:underline dark:text-red-400"
                      >
                        Quitar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="flex gap-3">
        <SubmitButton>Guardar solicitud</SubmitButton>
        <LinkButton href="/compras" variant="secondary">
          Cancelar
        </LinkButton>
      </div>
    </form>
  );
}
