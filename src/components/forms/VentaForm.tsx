"use client";

import { useActionState, useMemo, useState } from "react";
import { crearVentaAction } from "@/lib/actions/ventas";
import { crearCotizacionAction } from "@/lib/actions/cotizaciones";
import { Field } from "@/components/ui/Field";
import { FormError } from "@/components/ui/FormError";
import { SubmitButton, LinkButton } from "@/components/ui/Button";
import { formatMoney } from "@/lib/format";

const CLASE_INPUT =
  "rounded-lg border border-green-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-600 dark:border-green-800 dark:bg-green-950/30";

const ITBMS_TASA = 0.07;

export type CatalogoProducto = {
  id: string;
  numeroParte: string;
  descripcion: string;
  cantidad: number;
  venta: number;
};

export type CatalogoServicio = {
  id: string;
  nombre: string;
  descripcion: string | null;
  precio: number | null;
};

type Tipo = "nuevo" | "usado" | "servicio";

type ItemVenta = {
  tipo: Tipo;
  productoId: string | null;
  servicioId: string | null;
  descripcion: string;
  cantidad: number;
  precioUnitario: number;
};

export function VentaForm({
  fechaHoy,
  productosNuevos,
  productosUsados,
  servicios,
  modo = "venta",
}: {
  fechaHoy: string;
  productosNuevos: CatalogoProducto[];
  productosUsados: CatalogoProducto[];
  servicios: CatalogoServicio[];
  modo?: "venta" | "cotizacion";
}) {
  const [state, formAction] = useActionState(
    modo === "cotizacion" ? crearCotizacionAction : crearVentaAction,
    { error: null },
  );

  const [prevState, setPrevState] = useState(state);
  const [remountKey, setRemountKey] = useState(0);
  if (state !== prevState) {
    setPrevState(state);
    setRemountKey((k) => k + 1);
  }

  const v = state.values;

  const [items, setItems] = useState<ItemVenta[]>(() => {
    if (!v?.items) return [];
    try {
      return JSON.parse(v.items) as ItemVenta[];
    } catch {
      return [];
    }
  });

  const [tipoDraft, setTipoDraft] = useState<Tipo>("nuevo");
  const [idDraft, setIdDraft] = useState("");
  const [cantidadDraft, setCantidadDraft] = useState("1");
  const [precioDraft, setPrecioDraft] = useState("");

  const catalogoActivo: (CatalogoProducto | CatalogoServicio)[] =
    tipoDraft === "nuevo" ? productosNuevos : tipoDraft === "usado" ? productosUsados : servicios;

  const cantidadEnCarrito = useMemo(() => {
    const mapa: Record<string, number> = {};
    for (const it of items) {
      const clave = it.productoId ?? it.servicioId ?? "";
      mapa[clave] = (mapa[clave] ?? 0) + it.cantidad;
    }
    return mapa;
  }, [items]);

  const itemSeleccionado = catalogoActivo.find((c) => c.id === idDraft);
  const disponible =
    tipoDraft !== "servicio" && itemSeleccionado
      ? (itemSeleccionado as CatalogoProducto).cantidad - (cantidadEnCarrito[idDraft] ?? 0)
      : null;

  const cantidadDraftNum = Number(cantidadDraft) || 0;
  const excedeStock = disponible !== null && cantidadDraftNum > disponible;

  function elegirItem(id: string) {
    setIdDraft(id);
    const encontrado = catalogoActivo.find((c) => c.id === id);
    if (!encontrado) {
      setPrecioDraft("");
      return;
    }
    if (tipoDraft === "servicio") {
      const s = encontrado as CatalogoServicio;
      setPrecioDraft(s.precio !== null ? String(s.precio) : "");
    } else {
      const p = encontrado as CatalogoProducto;
      setPrecioDraft(String(p.venta));
    }
  }

  function agregarItem() {
    if (!itemSeleccionado || excedeStock) return;
    const cantidad = cantidadDraftNum;
    const precioUnitario = Number(precioDraft);
    if (!cantidad || cantidad <= 0 || Number.isNaN(precioUnitario) || precioUnitario < 0) return;

    const descripcion =
      tipoDraft === "servicio"
        ? (() => {
            const s = itemSeleccionado as CatalogoServicio;
            return s.descripcion ? `${s.nombre} — ${s.descripcion}` : s.nombre;
          })()
        : (() => {
            const p = itemSeleccionado as CatalogoProducto;
            return `${p.numeroParte} — ${p.descripcion}`;
          })();

    setItems((prev) => [
      ...prev,
      {
        tipo: tipoDraft,
        productoId: tipoDraft === "servicio" ? null : itemSeleccionado.id,
        servicioId: tipoDraft === "servicio" ? itemSeleccionado.id : null,
        descripcion,
        cantidad,
        precioUnitario,
      },
    ]);

    setIdDraft("");
    setCantidadDraft("1");
    setPrecioDraft("");
  }

  function quitarItem(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }

  const subtotalGravado = items
    .filter((i) => i.tipo !== "servicio")
    .reduce((s, i) => s + i.cantidad * i.precioUnitario, 0);
  const subtotalExento = items
    .filter((i) => i.tipo === "servicio")
    .reduce((s, i) => s + i.cantidad * i.precioUnitario, 0);
  const itbms = Math.round(subtotalGravado * ITBMS_TASA * 100) / 100;
  const total = subtotalGravado + subtotalExento + itbms;

  return (
    <form key={remountKey} action={formAction} className="flex flex-col gap-6">
      <FormError message={state.error} />
      <input type="hidden" name="items" value={JSON.stringify(items)} />

      <div className="flex max-w-2xl flex-col gap-4 rounded-xl border border-green-100 bg-white p-6 shadow-sm dark:border-green-900/40 dark:bg-green-950/10">
        <Field label="Fecha" name="fecha" type="date" defaultValue={v?.fecha ?? fechaHoy} required />
        <Field
          label="Cliente"
          name="clienteNombre"
          defaultValue={v?.clienteNombre ?? undefined}
          required
        />
        <Field
          label="Cédula/RUC (opcional)"
          name="clienteDocumento"
          defaultValue={v?.clienteDocumento ?? undefined}
        />
        <Field label="Nota (opcional)" name="nota" defaultValue={v?.nota ?? undefined} />
      </div>

      <div className="flex flex-col gap-4 rounded-xl border border-green-100 bg-white p-6 shadow-sm dark:border-green-900/40 dark:bg-green-950/10">
        <h2 className="text-lg font-semibold text-green-900 dark:text-green-50">
          Agregar productos o servicios
        </h2>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5 sm:items-end">
          <label className="flex flex-col gap-1 text-sm text-green-900 dark:text-green-100">
            Sección
            <select
              value={tipoDraft}
              onChange={(e) => {
                setTipoDraft(e.target.value as Tipo);
                setIdDraft("");
                setPrecioDraft("");
              }}
              className={CLASE_INPUT}
            >
              <option value="nuevo">Nuevo</option>
              <option value="usado">Usado</option>
              <option value="servicio">Servicio</option>
            </select>
          </label>

          <label className="col-span-2 flex flex-col gap-1 text-sm text-green-900 dark:text-green-100 sm:col-span-1">
            {tipoDraft === "servicio" ? "Servicio" : "Producto"}
            <select value={idDraft} onChange={(e) => elegirItem(e.target.value)} className={CLASE_INPUT}>
              <option value="">Selecciona...</option>
              {catalogoActivo.map((c) =>
                tipoDraft === "servicio" ? (
                  <option key={c.id} value={c.id}>
                    {(c as CatalogoServicio).nombre}
                    {(c as CatalogoServicio).descripcion ? ` — ${(c as CatalogoServicio).descripcion}` : ""}
                  </option>
                ) : (
                  <option key={c.id} value={c.id}>
                    {(c as CatalogoProducto).numeroParte} — {(c as CatalogoProducto).descripcion}
                    {(c as CatalogoProducto).cantidad === 0 ? " (sin stock)" : ""}
                  </option>
                ),
              )}
            </select>
          </label>

          <label className="flex flex-col gap-1 text-sm text-green-900 dark:text-green-100">
            Cantidad
            <input
              type="number"
              min={0}
              step={tipoDraft === "servicio" ? "0.01" : "1"}
              value={cantidadDraft}
              onChange={(e) => setCantidadDraft(e.target.value)}
              className={CLASE_INPUT}
            />
          </label>

          <label className="flex flex-col gap-1 text-sm text-green-900 dark:text-green-100">
            Precio unitario
            <input
              type="number"
              min={0}
              step="0.01"
              value={precioDraft}
              onChange={(e) => setPrecioDraft(e.target.value)}
              className={CLASE_INPUT}
            />
          </label>

          <button
            type="button"
            onClick={agregarItem}
            disabled={!itemSeleccionado || excedeStock || !cantidadDraftNum}
            className="rounded-lg bg-gradient-to-r from-green-600 to-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:opacity-90 disabled:opacity-40"
          >
            + Agregar
          </button>
        </div>

        {disponible !== null && (
          <p
            className={
              excedeStock
                ? "text-sm text-red-600 dark:text-red-400"
                : "text-sm text-green-700/70 dark:text-green-300/70"
            }
          >
            Disponible: {disponible}
            {excedeStock ? " — no hay suficiente stock" : ""}
          </p>
        )}

        {items.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] text-left text-sm">
              <thead>
                <tr className="border-b border-green-100 text-xs uppercase tracking-wide text-green-700 dark:border-green-900/40 dark:text-green-300">
                  <th className="px-2 py-2 font-medium">Descripción</th>
                  <th className="px-2 py-2 font-medium">Sección</th>
                  <th className="px-2 py-2 font-medium">Cant.</th>
                  <th className="px-2 py-2 font-medium">Precio unit.</th>
                  <th className="px-2 py-2 font-medium">ITBMS</th>
                  <th className="px-2 py-2 font-medium">Subtotal</th>
                  <th className="px-2 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {items.map((it, i) => (
                  <tr
                    key={i}
                    className="border-b border-green-50 last:border-0 dark:border-green-900/30"
                  >
                    <td className="px-2 py-2 text-green-900 dark:text-green-50">{it.descripcion}</td>
                    <td className="px-2 py-2 capitalize text-green-800/80 dark:text-green-200/80">
                      {it.tipo}
                    </td>
                    <td className="px-2 py-2 text-green-800/80 dark:text-green-200/80">{it.cantidad}</td>
                    <td className="px-2 py-2 text-green-800/80 dark:text-green-200/80">
                      {formatMoney(it.precioUnitario)}
                    </td>
                    <td className="px-2 py-2 text-green-800/80 dark:text-green-200/80">
                      {it.tipo === "servicio" ? "No aplica" : "7%"}
                    </td>
                    <td className="px-2 py-2 font-medium text-green-900 dark:text-green-50">
                      {formatMoney(it.cantidad * it.precioUnitario)}
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

        <div className="ml-auto flex w-full max-w-xs flex-col gap-1 rounded-lg border border-green-100 bg-green-50/60 p-4 text-sm dark:border-green-900/40 dark:bg-green-950/20">
          <div className="flex justify-between">
            <span className="text-green-800/80 dark:text-green-200/80">Subtotal gravado</span>
            <span className="text-green-900 dark:text-green-50">{formatMoney(subtotalGravado)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-green-800/80 dark:text-green-200/80">Subtotal exento</span>
            <span className="text-green-900 dark:text-green-50">{formatMoney(subtotalExento)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-green-800/80 dark:text-green-200/80">ITBMS (7%)</span>
            <span className="text-green-900 dark:text-green-50">{formatMoney(itbms)}</span>
          </div>
          <div className="mt-1 flex justify-between border-t border-green-200/60 pt-1 font-semibold dark:border-green-800/60">
            <span className="text-green-900 dark:text-green-50">Total</span>
            <span className="text-green-900 dark:text-green-50">{formatMoney(total)}</span>
          </div>
        </div>
      </div>

      <div className="flex gap-3">
        <SubmitButton>{modo === "cotizacion" ? "Guardar cotización" : "Guardar venta"}</SubmitButton>
        <LinkButton
          href={modo === "cotizacion" ? "/ventas/cotizaciones" : "/ventas"}
          variant="secondary"
        >
          Cancelar
        </LinkButton>
      </div>
    </form>
  );
}
