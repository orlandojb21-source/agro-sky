"use client";

import { useActionState, useState } from "react";
import { crearColaboradorAction, editarColaboradorAction } from "@/lib/actions/colaboradores";
import { subirFotoColaboradorAction } from "@/lib/actions/colaboradorFoto";
import { comprimirImagen } from "@/lib/comprimirImagen";
import { Field, SelectField } from "@/components/ui/Field";
import { FormError } from "@/components/ui/FormError";
import { SubmitButton, LinkButton } from "@/components/ui/Button";

type ValoresColaborador = {
  id?: string;
  nombre: string;
  tipo: "fijo" | "campo";
  salario: number | null;
  bonificacion: number | null;
  aplicaDeducciones: boolean;
  cedula: string | null;
  correo: string | null;
  telefono: string | null;
  direccion: string | null;
  fotoRuta: string | null;
  // URL firmada (temporal) de la foto ya guardada, generada del lado del
  // servidor solo para mostrarla -- nunca se envía en el formulario.
  fotoUrl: string | null;
};

const CLASE_INPUT_FOTO =
  "text-sm text-green-800 file:mr-3 file:rounded-lg file:border-0 file:bg-green-600 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-white hover:file:bg-green-700 dark:text-green-200";

export function ColaboradorForm({ valoresIniciales }: { valoresIniciales?: ValoresColaborador }) {
  const esEdicion = Boolean(valoresIniciales?.id);
  const [state, formAction] = useActionState(
    esEdicion ? editarColaboradorAction : crearColaboradorAction,
    { error: null },
  );

  const [prevState, setPrevState] = useState(state);
  const [remountKey, setRemountKey] = useState(0);

  const tipoInicial = (state.values?.tipo as "fijo" | "campo" | undefined) ?? valoresIniciales?.tipo ?? "campo";
  const [tipoSeleccionado, setTipoSeleccionado] = useState(tipoInicial);
  // Si ya se intento enviar el formulario (state.values existe), el checkbox
  // se reconstruye a partir de lo que realmente se envio ("on" o ausente) en
  // vez de asumir el valor por defecto -- para no perder la eleccion del
  // usuario en un reintento tras un error.
  const aplicaDeduccionesInicial = state.values
    ? state.values.aplicaDeducciones === "on"
    : (valoresIniciales?.aplicaDeducciones ?? true);

  const [fotoRuta, setFotoRuta] = useState(valoresIniciales?.fotoRuta ?? "");
  const [fotoPreviewUrl, setFotoPreviewUrl] = useState<string | null>(valoresIniciales?.fotoUrl ?? null);
  const [subiendoFoto, setSubiendoFoto] = useState(false);
  const [errorFoto, setErrorFoto] = useState<string | null>(null);

  if (state !== prevState) {
    setPrevState(state);
    setRemountKey((k) => k + 1);
    setTipoSeleccionado(tipoInicial);
    setFotoRuta(valoresIniciales?.fotoRuta ?? "");
    setFotoPreviewUrl(valoresIniciales?.fotoUrl ?? null);
    setErrorFoto(null);
  }

  async function elegirFoto(archivo: File | undefined) {
    if (!archivo) return;
    setErrorFoto(null);
    setSubiendoFoto(true);
    try {
      const comprimida = await comprimirImagen(archivo);
      setFotoPreviewUrl(URL.createObjectURL(comprimida));
      const fd = new FormData();
      fd.append("foto", comprimida, "foto.jpg");
      const { ruta } = await subirFotoColaboradorAction(fd);
      setFotoRuta(ruta);
    } catch (err) {
      setErrorFoto(err instanceof Error ? err.message : "No se pudo subir la foto. Intenta de nuevo.");
    } finally {
      setSubiendoFoto(false);
    }
  }

  function quitarFoto() {
    setFotoRuta("");
    setFotoPreviewUrl(null);
    setErrorFoto(null);
  }

  return (
    <form
      key={remountKey}
      action={formAction}
      className="flex flex-col gap-4 rounded-xl border border-green-100 bg-white p-6 shadow-sm dark:border-green-900/40 dark:bg-green-950/10"
    >
      <FormError message={state.error} />
      {esEdicion && <input type="hidden" name="id" value={valoresIniciales!.id} />}
      <input type="hidden" name="fotoRuta" value={fotoRuta} />
      <input type="hidden" name="fotoRutaAnterior" value={valoresIniciales?.fotoRuta ?? ""} />
      {state.success && (
        <p className="rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700 dark:border-green-800 dark:bg-green-950/30 dark:text-green-300">
          Colaborador agregado.
        </p>
      )}

      <div className="flex flex-wrap items-end gap-3">
        <div className="flex-1 min-w-[200px]">
          <Field
            label="Nombre completo"
            name="nombre"
            defaultValue={state.values?.nombre ?? valoresIniciales?.nombre}
            required
          />
        </div>
        <div className="min-w-[160px]">
          <SelectField
            label="Tipo"
            name="tipo"
            defaultValue={tipoInicial}
            onChange={(e) => setTipoSeleccionado(e.target.value as "fijo" | "campo")}
            required
          >
            <option value="fijo">Fijo (salario mensual)</option>
            <option value="campo">Campo (pago por día)</option>
          </SelectField>
        </div>
        {tipoSeleccionado === "fijo" && (
          <>
            <div className="min-w-[160px]">
              <Field
                label="Salario mensual (USD)"
                name="salario"
                type="number"
                min={0}
                step="0.01"
                defaultValue={state.values?.salario ?? valoresIniciales?.salario ?? undefined}
                required
              />
            </div>
            <div className="min-w-[160px]">
              <Field
                label="Bonificación mensual (USD, opcional — no aplica CSS ni Seguro Educativo)"
                name="bonificacion"
                type="number"
                min={0}
                step="0.01"
                defaultValue={state.values?.bonificacion ?? valoresIniciales?.bonificacion ?? undefined}
              />
            </div>
            <label className="flex items-center gap-2 pb-2.5 text-sm text-green-900 dark:text-green-100">
              <input
                type="checkbox"
                name="aplicaDeducciones"
                defaultChecked={aplicaDeduccionesInicial}
                className="h-4 w-4 rounded border-green-300 text-green-600 focus:ring-green-600"
              />
              Aplica CSS / Seguro Educativo (9.75% / 1.25%)
            </label>
          </>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field
          label="Cédula"
          name="cedula"
          defaultValue={state.values?.cedula ?? valoresIniciales?.cedula ?? undefined}
        />
        <Field
          label="Correo"
          name="correo"
          type="email"
          defaultValue={state.values?.correo ?? valoresIniciales?.correo ?? undefined}
        />
        <Field
          label="Teléfono"
          name="telefono"
          defaultValue={state.values?.telefono ?? valoresIniciales?.telefono ?? undefined}
        />
        <Field
          label="Dirección"
          name="direccion"
          defaultValue={state.values?.direccion ?? valoresIniciales?.direccion ?? undefined}
        />
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-sm text-green-900 dark:text-green-100">Foto</span>
        <div className="flex flex-wrap items-center gap-4">
          {fotoPreviewUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={fotoPreviewUrl}
              alt="Foto del colaborador"
              className="h-20 w-20 rounded-full border border-green-200 object-cover dark:border-green-800"
            />
          )}
          <div className="flex flex-col gap-1">
            <input
              type="file"
              accept="image/*"
              capture="user"
              disabled={subiendoFoto}
              onChange={(e) => elegirFoto(e.target.files?.[0])}
              className={CLASE_INPUT_FOTO}
            />
            {subiendoFoto && (
              <span className="text-xs text-green-700/70 dark:text-green-300/70">Subiendo foto...</span>
            )}
            {errorFoto && <span className="text-xs text-red-600 dark:text-red-400">{errorFoto}</span>}
            {fotoRuta && !subiendoFoto && (
              <button
                type="button"
                onClick={quitarFoto}
                className="self-start text-xs text-red-600 hover:underline dark:text-red-400"
              >
                Quitar foto
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="flex gap-3">
        <SubmitButton disabled={subiendoFoto}>
          {esEdicion ? "Guardar cambios" : "+ Agregar colaborador"}
        </SubmitButton>
        {esEdicion && (
          <LinkButton href="/planilla/colaboradores" variant="secondary">
            Cancelar
          </LinkButton>
        )}
      </div>
    </form>
  );
}
