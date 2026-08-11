"use client";

import { useActionState, useState } from "react";
import { crearGastoAction, editarGastoAction } from "@/lib/actions/gastos";
import { subirComprobanteGastoAction } from "@/lib/actions/gastoComprobante";
import { comprimirImagen } from "@/lib/comprimirImagen";
import { CATEGORIA_GASTO_LABEL } from "@/lib/validation/gastos";
import { CategoriaGastoField } from "@/components/forms/CategoriaGastoField";
import { Field, SelectField } from "@/components/ui/Field";
import { FormError } from "@/components/ui/FormError";
import { SubmitButton, LinkButton } from "@/components/ui/Button";

export type ProveedorOpcion = { id: string; nombre: string };

type ValoresGasto = {
  id?: string;
  fecha: string;
  proveedorId: string | null;
  categoria: string;
  categoriaOtro: string | null;
  numeroFactura: string | null;
  monto: number;
  descripcion: string | null;
  comprobanteRuta: string | null;
  // URL firmada (temporal) del comprobante ya guardado, generada del lado
  // del servidor solo para mostrarla -- nunca se envía en el formulario.
  comprobanteUrl: string | null;
};

const CLASE_INPUT_ARCHIVO =
  "text-sm text-green-800 file:mr-3 file:rounded-lg file:border-0 file:bg-green-600 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-white hover:file:bg-green-700 dark:text-green-200";

export function GastoForm({
  proveedores,
  categorias,
  fechaHoy,
  valoresIniciales,
}: {
  proveedores: ProveedorOpcion[];
  categorias: string[];
  fechaHoy: string;
  valoresIniciales?: ValoresGasto;
}) {
  const esEdicion = Boolean(valoresIniciales?.id);
  const [state, formAction] = useActionState(
    esEdicion ? editarGastoAction : crearGastoAction,
    { error: null },
  );

  const [prevState, setPrevState] = useState(state);
  const [remountKey, setRemountKey] = useState(0);

  const categoriaInicial = state.values?.categoria ?? valoresIniciales?.categoria ?? "alquiler";
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState(categoriaInicial);

  const [comprobanteRuta, setComprobanteRuta] = useState(valoresIniciales?.comprobanteRuta ?? "");
  const [comprobantePreviewUrl, setComprobantePreviewUrl] = useState<string | null>(
    valoresIniciales?.comprobanteUrl ?? null,
  );
  const [subiendoComprobante, setSubiendoComprobante] = useState(false);
  const [errorComprobante, setErrorComprobante] = useState<string | null>(null);

  if (state !== prevState) {
    setPrevState(state);
    setRemountKey((k) => k + 1);
    setCategoriaSeleccionada(categoriaInicial);
    setComprobanteRuta(valoresIniciales?.comprobanteRuta ?? "");
    setComprobantePreviewUrl(valoresIniciales?.comprobanteUrl ?? null);
    setErrorComprobante(null);
  }

  async function elegirComprobante(archivo: File | undefined) {
    if (!archivo) return;
    setErrorComprobante(null);
    setSubiendoComprobante(true);
    try {
      const comprimido = await comprimirImagen(archivo);
      setComprobantePreviewUrl(URL.createObjectURL(comprimido));
      const fd = new FormData();
      fd.append("comprobante", comprimido, "comprobante.jpg");
      const { ruta } = await subirComprobanteGastoAction(fd);
      setComprobanteRuta(ruta);
    } catch (err) {
      setErrorComprobante(err instanceof Error ? err.message : "No se pudo subir el comprobante.");
    } finally {
      setSubiendoComprobante(false);
    }
  }

  function quitarComprobante() {
    setComprobanteRuta("");
    setComprobantePreviewUrl(null);
    setErrorComprobante(null);
  }

  return (
    <form
      key={remountKey}
      action={formAction}
      className="flex flex-col gap-4 rounded-xl border border-green-100 bg-white p-6 shadow-sm dark:border-green-900/40 dark:bg-green-950/10"
    >
      <FormError message={state.error} />
      {esEdicion && <input type="hidden" name="id" value={valoresIniciales!.id} />}
      <input type="hidden" name="comprobanteRuta" value={comprobanteRuta} />
      <input type="hidden" name="comprobanteRutaAnterior" value={valoresIniciales?.comprobanteRuta ?? ""} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field
          label="Fecha"
          name="fecha"
          type="date"
          defaultValue={state.values?.fecha ?? valoresIniciales?.fecha ?? fechaHoy}
          required
        />
        <SelectField
          label="Proveedor"
          name="proveedorId"
          defaultValue={state.values?.proveedorId ?? valoresIniciales?.proveedorId ?? ""}
        >
          <option value="">Sin proveedor</option>
          {proveedores.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nombre}
            </option>
          ))}
        </SelectField>
        <CategoriaGastoField
          contexto="compras"
          categoriasIniciales={categorias}
          etiquetas={CATEGORIA_GASTO_LABEL}
          valorInicial={categoriaInicial}
          onChange={setCategoriaSeleccionada}
          required
        />
        {categoriaSeleccionada === "otro" && (
          <Field
            label="¿Cuál?"
            name="categoriaOtro"
            defaultValue={state.values?.categoriaOtro ?? valoresIniciales?.categoriaOtro ?? undefined}
            required
          />
        )}
        <Field
          label="Número de factura"
          name="numeroFactura"
          defaultValue={state.values?.numeroFactura ?? valoresIniciales?.numeroFactura ?? undefined}
          placeholder="Opcional"
        />
        <Field
          label="Monto (USD)"
          name="monto"
          type="number"
          min={0}
          step="0.01"
          defaultValue={state.values?.monto ?? valoresIniciales?.monto ?? undefined}
          required
        />
      </div>

      <Field
        label="Descripción"
        name="descripcion"
        defaultValue={state.values?.descripcion ?? valoresIniciales?.descripcion ?? undefined}
        placeholder="Opcional"
      />

      <div className="flex flex-col gap-2">
        <span className="text-sm text-green-900 dark:text-green-100">Comprobante (foto de la factura)</span>
        <div className="flex flex-wrap items-center gap-4">
          {comprobantePreviewUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={comprobantePreviewUrl}
              alt="Comprobante del gasto"
              className="h-20 w-20 rounded-lg border border-green-200 object-cover dark:border-green-800"
            />
          )}
          <div className="flex flex-col gap-1">
            <input
              type="file"
              accept="image/*"
              capture="environment"
              disabled={subiendoComprobante}
              onChange={(e) => elegirComprobante(e.target.files?.[0])}
              className={CLASE_INPUT_ARCHIVO}
            />
            {subiendoComprobante && (
              <span className="text-xs text-green-700/70 dark:text-green-300/70">Subiendo comprobante...</span>
            )}
            {errorComprobante && <span className="text-xs text-red-600 dark:text-red-400">{errorComprobante}</span>}
            {comprobanteRuta && !subiendoComprobante && (
              <button
                type="button"
                onClick={quitarComprobante}
                className="self-start text-xs text-red-600 hover:underline dark:text-red-400"
              >
                Quitar comprobante
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="flex gap-3">
        <SubmitButton disabled={subiendoComprobante}>
          {esEdicion ? "Guardar cambios" : "+ Agregar gasto"}
        </SubmitButton>
        {esEdicion && (
          <LinkButton href="/compras/gastos" variant="secondary">
            Cancelar
          </LinkButton>
        )}
      </div>
    </form>
  );
}
