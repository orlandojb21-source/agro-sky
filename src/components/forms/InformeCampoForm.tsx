"use client";

import { useState } from "react";
import { useActionState } from "react";
import { crearInformeCampoAction, editarInformeCampoAction } from "@/lib/actions/informesCampo";
import { subirFirmaInformeCampoAction } from "@/lib/actions/informeCampoFirma";
import { Field, SelectField } from "@/components/ui/Field";
import { FormError } from "@/components/ui/FormError";
import { FirmaCanvas } from "@/components/ui/FirmaCanvas";
import { SubmitButton, LinkButton } from "@/components/ui/Button";

const CLASE_INPUT =
  "w-full rounded-lg border border-green-200 bg-white px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-600 dark:border-green-800 dark:bg-green-950/30";

type ParcelaDraft = { numeroParcela: string; hectareas: string };
type ProductoDraft = { productoActivo: string; ltsPorHectarea: string };

function parcelaVacia(): ParcelaDraft {
  return { numeroParcela: "", hectareas: "" };
}
function productoVacio(): ProductoDraft {
  return { productoActivo: "", ltsPorHectarea: "" };
}

export type ValoresInformeCampo = {
  id: string;
  cliente: string;
  fecha: string;
  finca: string;
  horaInicio: string;
  horaFin: string;
  meteorologia: string;
  modeloDrone: string;
  dosisPorHectarea: number;
  operador: string;
  ayudantes: string[];
  firmaAgroRuta: string | null;
  nombreFirmaAgro: string | null;
  firmaAgroUrl: string | null;
  firmaClienteRuta: string | null;
  nombreFirmaCliente: string | null;
  firmaClienteUrl: string | null;
  parcelas: { numeroParcela: string; hectareas: number }[];
  productos: { productoActivo: string; ltsPorHectarea: number }[];
};

async function subirFirma(blob: Blob): Promise<string> {
  const fd = new FormData();
  fd.append("firma", blob, "firma.png");
  const { ruta } = await subirFirmaInformeCampoAction(fd);
  return ruta;
}

export function InformeCampoForm({
  fechaHoy,
  colaboradoresCampo = [],
  valoresIniciales,
}: {
  fechaHoy: string;
  colaboradoresCampo?: string[];
  valoresIniciales?: ValoresInformeCampo;
}) {
  const esEdicion = Boolean(valoresIniciales?.id);
  const [state, formAction] = useActionState(
    esEdicion ? editarInformeCampoAction : crearInformeCampoAction,
    { error: null },
  );

  const v = state.values;

  // React 19 vacía todos los inputs no controlados del <form> después de
  // CUALQUIER resolución de la action, incluso en un error de validación
  // -- este remount fuerza a los campos con defaultValue a releerlo desde
  // "v" (lo que realmente se envió), en vez de perder lo que la persona
  // ya había escrito (mismo patrón que ProyectoInformeForm.tsx).
  const [prevState, setPrevState] = useState(state);
  const [remountKey, setRemountKey] = useState(0);

  const [operador, setOperador] = useState(v?.operador ?? valoresIniciales?.operador ?? "");

  const [ayudantes, setAyudantes] = useState<string[]>(() => {
    if (v?.ayudantes) {
      try {
        return JSON.parse(v.ayudantes) as string[];
      } catch {
        // sigue abajo con los valores iniciales / sin ayudantes
      }
    }
    return valoresIniciales?.ayudantes ?? [];
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
    if (valoresIniciales?.parcelas && valoresIniciales.parcelas.length > 0) {
      return valoresIniciales.parcelas.map((p) => ({
        numeroParcela: p.numeroParcela,
        hectareas: String(p.hectareas),
      }));
    }
    return [parcelaVacia()];
  });

  const [productos, setProductos] = useState<ProductoDraft[]>(() => {
    if (v?.productos) {
      try {
        const parsed = JSON.parse(v.productos) as { productoActivo: string; ltsPorHectarea: number }[];
        if (parsed.length > 0) {
          return parsed.map((p) => ({
            productoActivo: p.productoActivo,
            ltsPorHectarea: String(p.ltsPorHectarea),
          }));
        }
      } catch {
        // sigue abajo
      }
    }
    if (valoresIniciales?.productos && valoresIniciales.productos.length > 0) {
      return valoresIniciales.productos.map((p) => ({
        productoActivo: p.productoActivo,
        ltsPorHectarea: String(p.ltsPorHectarea),
      }));
    }
    // Opcional -- no siempre se usa, arranca sin filas (pedido explícito
    // del usuario).
    return [];
  });

  const [firmaAgroRuta, setFirmaAgroRuta] = useState(
    v?.firmaAgroRuta ?? valoresIniciales?.firmaAgroRuta ?? "",
  );
  const [firmaClienteRuta, setFirmaClienteRuta] = useState(
    v?.firmaClienteRuta ?? valoresIniciales?.firmaClienteRuta ?? "",
  );

  if (state !== prevState) {
    setPrevState(state);
    setRemountKey((k) => k + 1);
  }

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

  function actualizarProducto(i: number, campo: keyof ProductoDraft, valor: string) {
    setProductos((prev) => prev.map((p, idx) => (idx === i ? { ...p, [campo]: valor } : p)));
  }
  function agregarProducto() {
    setProductos((prev) => [...prev, productoVacio()]);
  }
  function quitarProducto(i: number) {
    // Opcional -- a diferencia de Parcelas, se puede quitar hasta la
    // última fila (queda un array vacío).
    setProductos((prev) => prev.filter((_, idx) => idx !== i));
  }

  const ayudantesParaEnviar = ayudantes.map((a) => a.trim()).filter((a) => a !== "");
  const parcelasParaEnviar = parcelas.map((p) => ({
    numeroParcela: p.numeroParcela,
    hectareas: Number(p.hectareas) || 0,
  }));
  const productosParaEnviar = productos.map((p) => ({
    productoActivo: p.productoActivo,
    ltsPorHectarea: Number(p.ltsPorHectarea) || 0,
  }));

  const faltaAlgunaFirma = !firmaAgroRuta || !firmaClienteRuta;

  return (
    <form key={remountKey} action={formAction} className="flex flex-col gap-6">
      <FormError message={state.error} />
      <input type="hidden" name="ayudantes" value={JSON.stringify(ayudantesParaEnviar)} />
      <input type="hidden" name="parcelas" value={JSON.stringify(parcelasParaEnviar)} />
      <input type="hidden" name="productos" value={JSON.stringify(productosParaEnviar)} />
      {esEdicion && <input type="hidden" name="id" value={valoresIniciales!.id} />}

      <div className="grid max-w-2xl grid-cols-1 gap-4 rounded-xl border border-green-100 bg-white p-6 shadow-sm sm:grid-cols-2 dark:border-green-900/40 dark:bg-green-950/10">
        <div className="sm:col-span-2">
          <Field
            label="Nombre del cliente"
            name="cliente"
            defaultValue={v?.cliente ?? valoresIniciales?.cliente ?? undefined}
            required
          />
        </div>
        <Field
          label="Fecha de trabajo"
          name="fecha"
          type="date"
          defaultValue={v?.fecha ?? valoresIniciales?.fecha ?? fechaHoy}
          required
        />
        <Field
          label="Finca"
          name="finca"
          defaultValue={v?.finca ?? valoresIniciales?.finca ?? undefined}
          required
        />
        <Field
          label="Hora de inicio"
          name="horaInicio"
          type="time"
          defaultValue={v?.horaInicio ?? valoresIniciales?.horaInicio ?? undefined}
          required
        />
        <Field
          label="Hora de finalización"
          name="horaFin"
          type="time"
          defaultValue={v?.horaFin ?? valoresIniciales?.horaFin ?? undefined}
          required
        />
        <div className="sm:col-span-2">
          <Field
            label="Meteorología"
            name="meteorologia"
            defaultValue={v?.meteorologia ?? valoresIniciales?.meteorologia ?? undefined}
            placeholder="Ej. Soleado, viento leve"
            required
          />
        </div>
      </div>

      <div className="flex flex-col gap-4 rounded-xl border border-green-100 bg-white p-6 shadow-sm dark:border-green-900/40 dark:bg-green-950/10">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-green-700/80 dark:text-green-300/80">
          Parcelas
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

      <div className="grid max-w-2xl grid-cols-1 gap-4 rounded-xl border border-green-100 bg-white p-6 shadow-sm sm:grid-cols-2 dark:border-green-900/40 dark:bg-green-950/10">
        <Field
          label="Modelo de Drone"
          name="modeloDrone"
          defaultValue={v?.modeloDrone ?? valoresIniciales?.modeloDrone ?? undefined}
          required
        />
        <Field
          label="Dosis por Hectárea"
          name="dosisPorHectarea"
          type="number"
          min={0}
          step="0.01"
          defaultValue={v?.dosisPorHectarea ?? valoresIniciales?.dosisPorHectarea ?? undefined}
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
            defaultValue={operador}
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
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-green-700/80 dark:text-green-300/80">
            Productos
          </h2>
          <p className="mt-1 text-xs text-green-700/60 dark:text-green-300/60">
            Opcional — no siempre se usa.
          </p>
        </div>
        {productos.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[420px] text-left text-sm">
              <thead>
                <tr className="border-b border-green-100 text-xs uppercase tracking-wide text-green-700 dark:border-green-900/40 dark:text-green-300">
                  <th className="px-2 py-2 font-medium">Producto activo</th>
                  <th className="px-2 py-2 font-medium">Lts por Hectárea</th>
                  <th className="px-2 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {productos.map((p, i) => (
                  <tr key={i} className="border-b border-green-50 last:border-0 dark:border-green-900/30">
                    <td className="px-2 py-2">
                      <input
                        value={p.productoActivo}
                        onChange={(e) => actualizarProducto(i, "productoActivo", e.target.value)}
                        className={CLASE_INPUT}
                      />
                    </td>
                    <td className="px-2 py-2">
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        value={p.ltsPorHectarea}
                        onChange={(e) => actualizarProducto(i, "ltsPorHectarea", e.target.value)}
                        className={CLASE_INPUT}
                      />
                    </td>
                    <td className="px-2 py-2">
                      <button
                        type="button"
                        onClick={() => quitarProducto(i)}
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
        <button
          type="button"
          onClick={agregarProducto}
          className="self-start rounded-lg border border-green-200 px-3 py-1.5 text-sm text-green-800 hover:bg-green-50 dark:border-green-800 dark:text-green-200 dark:hover:bg-green-950/40"
        >
          + Agregar producto
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6 rounded-xl border border-green-100 bg-white p-6 shadow-sm sm:grid-cols-2 dark:border-green-900/40 dark:bg-green-950/10">
        <div className="flex flex-col gap-3">
          <Field
            label="Nombre — Encargado Agro Sky Corp"
            name="nombreFirmaAgro"
            defaultValue={v?.nombreFirmaAgro ?? valoresIniciales?.nombreFirmaAgro ?? undefined}
            required
          />
          <FirmaCanvas
            label="Firma — Encargado Agro Sky Corp"
            name="firmaAgroRuta"
            rutaInicial={v?.firmaAgroRuta ?? valoresIniciales?.firmaAgroRuta}
            urlInicial={valoresIniciales?.firmaAgroUrl}
            onGuardar={subirFirma}
            onRutaCambia={setFirmaAgroRuta}
          />
        </div>
        <div className="flex flex-col gap-3">
          <Field
            label="Nombre — Encargado por parte del cliente"
            name="nombreFirmaCliente"
            defaultValue={v?.nombreFirmaCliente ?? valoresIniciales?.nombreFirmaCliente ?? undefined}
            required
          />
          <FirmaCanvas
            label="Firma — Encargado por parte del cliente"
            name="firmaClienteRuta"
            rutaInicial={v?.firmaClienteRuta ?? valoresIniciales?.firmaClienteRuta}
            urlInicial={valoresIniciales?.firmaClienteUrl}
            onGuardar={subirFirma}
            onRutaCambia={setFirmaClienteRuta}
          />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex gap-3">
          <SubmitButton disabled={faltaAlgunaFirma}>
            {esEdicion ? "Guardar cambios" : "Guardar informe"}
          </SubmitButton>
          <LinkButton
            href={esEdicion ? `/informes-campo/${valoresIniciales!.id}` : "/informes-campo"}
            variant="secondary"
          >
            Cancelar
          </LinkButton>
        </div>
        {faltaAlgunaFirma && (
          <p className="text-xs text-green-700/70 dark:text-green-300/70">
            Faltan firmas por guardar — dibuja y guarda ambas firmas antes de guardar el informe.
          </p>
        )}
      </div>
    </form>
  );
}
