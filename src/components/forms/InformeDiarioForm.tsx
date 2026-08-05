"use client";

import { useActionState, useState } from "react";
import { crearInformeDiarioAction, editarInformeDiarioAction } from "@/lib/actions/informesDiarios";
import { subirImagenControlAction } from "@/lib/actions/informeDiarioImagen";
import { comprimirImagen } from "@/lib/comprimirImagen";
import { Field, SelectField } from "@/components/ui/Field";
import { FormError } from "@/components/ui/FormError";
import { SubmitButton, LinkButton } from "@/components/ui/Button";
import { formatDateOnly } from "@/lib/format";

export type InformeCampoOpcion = {
  id: string;
  cliente: string;
  finca: string;
  fecha: string;
  operador: string;
  dosisPorHectarea: string;
  hectareas: number;
};

export type ValoresInformeDiario = {
  id: string;
  informeCampoId: string;
  // "Nombre" en el documento -- es el cliente del Informe de Campo (ej.
  // "Ingenio Santa Rosa"), no quién voló el drone.
  cliente: string;
  fecha: string;
  hectareasAplicadas: number;
  tipoAplicacion: string;
  dosis: string;
  boquillas: string;
  alturaVuelo: string;
  anchoPases: string;
  velocidad: string;
  nota: string | null;
  imagenControlRuta: string | null;
  // URL firmada (temporal) de la imagen ya guardada, generada del lado del
  // servidor solo para mostrarla -- nunca se envía en el formulario.
  imagenControlUrl: string | null;
};

const CLASE_INPUT_IMAGEN =
  "text-sm text-green-800 file:mr-3 file:rounded-lg file:border-0 file:bg-green-600 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-white hover:file:bg-green-700 dark:text-green-200";

const CLASE_TEXTAREA =
  "rounded-lg border border-green-200 bg-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-600 dark:border-green-800 dark:bg-green-950/30";

export function InformeDiarioForm({
  informesCampoDisponibles,
  valoresIniciales,
}: {
  informesCampoDisponibles: InformeCampoOpcion[];
  valoresIniciales?: ValoresInformeDiario;
}) {
  const esEdicion = Boolean(valoresIniciales?.id);
  const [state, formAction] = useActionState(
    esEdicion ? editarInformeDiarioAction : crearInformeDiarioAction,
    { error: null },
  );

  const v = state.values;

  // Mismo patrón de remount que InformeCampoForm.tsx -- React 19 vacía
  // todos los inputs no controlados tras cualquier resolución de la
  // action, incluso en un error de validación.
  const [prevState, setPrevState] = useState(state);
  const [remountKey, setRemountKey] = useState(0);

  const [informeCampoId, setInformeCampoId] = useState(
    v?.informeCampoId ?? valoresIniciales?.informeCampoId ?? "",
  );
  const [cliente, setCliente] = useState(v?.cliente ?? valoresIniciales?.cliente ?? "");
  const [fecha, setFecha] = useState(v?.fecha ?? valoresIniciales?.fecha ?? "");
  const [hectareasAplicadas, setHectareasAplicadas] = useState(
    v?.hectareasAplicadas ??
      (valoresIniciales?.hectareasAplicadas != null ? String(valoresIniciales.hectareasAplicadas) : ""),
  );
  const [dosis, setDosis] = useState(v?.dosis ?? valoresIniciales?.dosis ?? "");

  const [imagenRuta, setImagenRuta] = useState(
    v?.imagenControlRuta ?? valoresIniciales?.imagenControlRuta ?? "",
  );
  const [imagenPreviewUrl, setImagenPreviewUrl] = useState<string | null>(
    valoresIniciales?.imagenControlUrl ?? null,
  );
  const [subiendoImagen, setSubiendoImagen] = useState(false);
  const [errorImagen, setErrorImagen] = useState<string | null>(null);

  if (state !== prevState) {
    setPrevState(state);
    setRemountKey((k) => k + 1);
  }

  // Al elegir un Informe de Campo se autollenan Nombre/Fecha/Hectáreas/
  // Dosis con sus datos (para no volver a escribirlos a mano), pero los 4
  // siguen totalmente editables después -- mismo principio de "autollenar
  // pero editable" que ya usa el resto de la app. "Nombre" es el CLIENTE
  // del Informe de Campo (a quién se le envía este documento), no el
  // operador que voló el drone.
  function elegirInformeCampo(id: string) {
    setInformeCampoId(id);
    const informe = informesCampoDisponibles.find((i) => i.id === id);
    if (informe) {
      setCliente(informe.cliente);
      setFecha(informe.fecha);
      setHectareasAplicadas(String(informe.hectareas));
      setDosis(String(informe.dosisPorHectarea));
    }
  }

  const informeCampoElegido = informesCampoDisponibles.find((i) => i.id === informeCampoId);

  async function elegirImagen(archivo: File | undefined) {
    if (!archivo) return;
    setErrorImagen(null);
    setSubiendoImagen(true);
    try {
      const comprimida = await comprimirImagen(archivo);
      setImagenPreviewUrl(URL.createObjectURL(comprimida));
      const fd = new FormData();
      fd.append("imagen", comprimida, "captura.jpg");
      const { ruta } = await subirImagenControlAction(fd);
      setImagenRuta(ruta);
    } catch (err) {
      setErrorImagen(err instanceof Error ? err.message : "No se pudo subir la imagen. Intenta de nuevo.");
    } finally {
      setSubiendoImagen(false);
    }
  }

  function quitarImagen() {
    setImagenRuta("");
    setImagenPreviewUrl(null);
    setErrorImagen(null);
  }

  return (
    <form
      key={remountKey}
      action={formAction}
      className="flex max-w-2xl flex-col gap-4 rounded-xl border border-green-100 bg-white p-6 shadow-sm dark:border-green-900/40 dark:bg-green-950/10"
    >
      <FormError message={state.error} />
      {esEdicion && <input type="hidden" name="id" value={valoresIniciales!.id} />}
      <input type="hidden" name="imagenControlRuta" value={imagenRuta} />
      <input type="hidden" name="imagenControlRutaAnterior" value={valoresIniciales?.imagenControlRuta ?? ""} />

      <SelectField
        label="Informe de Campo relacionado"
        name="informeCampoId"
        value={informeCampoId}
        onChange={(e) => elegirInformeCampo(e.target.value)}
        required
      >
        <option value="">Selecciona...</option>
        {informesCampoDisponibles.map((i) => (
          <option key={i.id} value={i.id}>
            {formatDateOnly(i.fecha)} — {i.cliente} — {i.operador} ({i.hectareas} ha)
          </option>
        ))}
      </SelectField>
      {informeCampoElegido && (
        <p className="text-xs text-green-700/70 dark:text-green-300/70">
          Vinculado a: {informeCampoElegido.cliente} — {informeCampoElegido.finca} —{" "}
          {formatDateOnly(informeCampoElegido.fecha)} — {informeCampoElegido.hectareas} ha — Operador:{" "}
          {informeCampoElegido.operador}
        </p>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field
          label="Nombre"
          name="cliente"
          value={cliente}
          onChange={(e) => setCliente(e.target.value)}
          required
        />
        <Field
          label="Fecha"
          name="fecha"
          type="date"
          value={fecha}
          onChange={(e) => setFecha(e.target.value)}
          required
        />
        <Field
          label="Hectáreas Aplicadas"
          name="hectareasAplicadas"
          type="number"
          min={0}
          step="0.01"
          value={hectareasAplicadas}
          onChange={(e) => setHectareasAplicadas(e.target.value)}
          required
        />
        <Field
          label="Dosis"
          name="dosis"
          value={dosis}
          onChange={(e) => setDosis(e.target.value)}
          required
        />
        <Field
          label="Tipo de Aplicación"
          name="tipoAplicacion"
          defaultValue={v?.tipoAplicacion ?? valoresIniciales?.tipoAplicacion ?? undefined}
          required
        />
        <Field
          label="Boquillas"
          name="boquillas"
          defaultValue={v?.boquillas ?? valoresIniciales?.boquillas ?? undefined}
          required
        />
        <Field
          label="Altura de Vuelo"
          name="alturaVuelo"
          defaultValue={v?.alturaVuelo ?? valoresIniciales?.alturaVuelo ?? undefined}
          required
        />
        <Field
          label="Ancho de Pases"
          name="anchoPases"
          defaultValue={v?.anchoPases ?? valoresIniciales?.anchoPases ?? undefined}
          required
        />
        <Field
          label="Velocidad"
          name="velocidad"
          defaultValue={v?.velocidad ?? valoresIniciales?.velocidad ?? undefined}
          required
        />
      </div>

      <label className="flex flex-col gap-1 text-sm text-green-900 dark:text-green-100">
        Nota (opcional)
        <textarea
          name="nota"
          rows={3}
          defaultValue={v?.nota ?? valoresIniciales?.nota ?? undefined}
          className={CLASE_TEXTAREA}
        />
      </label>

      <div className="flex flex-col gap-2">
        <span className="text-sm text-green-900 dark:text-green-100">
          Captura del control del drone (opcional)
        </span>
        <div className="flex flex-wrap items-center gap-4">
          {imagenPreviewUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={imagenPreviewUrl}
              alt="Captura del control del drone"
              className="h-24 w-auto rounded-lg border border-green-200 object-contain dark:border-green-800"
            />
          )}
          <div className="flex flex-col gap-1">
            <input
              type="file"
              accept="image/*"
              disabled={subiendoImagen}
              onChange={(e) => elegirImagen(e.target.files?.[0])}
              className={CLASE_INPUT_IMAGEN}
            />
            {subiendoImagen && (
              <span className="text-xs text-green-700/70 dark:text-green-300/70">Subiendo imagen...</span>
            )}
            {errorImagen && <span className="text-xs text-red-600 dark:text-red-400">{errorImagen}</span>}
            {imagenRuta && !subiendoImagen && (
              <button
                type="button"
                onClick={quitarImagen}
                className="self-start text-xs text-red-600 hover:underline dark:text-red-400"
              >
                Quitar imagen
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="flex gap-3">
        <SubmitButton disabled={subiendoImagen}>
          {esEdicion ? "Guardar cambios" : "Guardar informe"}
        </SubmitButton>
        <LinkButton
          href={esEdicion ? `/informes/diario/${valoresIniciales!.id}` : "/informes/diario"}
          variant="secondary"
        >
          Cancelar
        </LinkButton>
      </div>
    </form>
  );
}
