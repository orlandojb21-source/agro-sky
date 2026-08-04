"use client";

import { useActionState, useState } from "react";
import { crearProveedorAction, editarProveedorAction } from "@/lib/actions/proveedores";
import { Field } from "@/components/ui/Field";
import { FormError } from "@/components/ui/FormError";
import { SubmitButton, LinkButton } from "@/components/ui/Button";

type ValoresProveedor = {
  id?: string;
  nombre: string;
  contacto: string | null;
  telefono: string | null;
  correo: string | null;
  direccion: string | null;
  ruc: string | null;
  dv: string | null;
  nota: string | null;
};

export function ProveedorForm({ valoresIniciales }: { valoresIniciales?: ValoresProveedor }) {
  const esEdicion = Boolean(valoresIniciales?.id);
  const [state, formAction] = useActionState(
    esEdicion ? editarProveedorAction : crearProveedorAction,
    { error: null },
  );

  const [prevState, setPrevState] = useState(state);
  const [remountKey, setRemountKey] = useState(0);

  if (state !== prevState) {
    setPrevState(state);
    setRemountKey((k) => k + 1);
  }

  return (
    <form
      key={remountKey}
      action={formAction}
      className="flex flex-col gap-4 rounded-xl border border-green-100 bg-white p-6 shadow-sm dark:border-green-900/40 dark:bg-green-950/10"
    >
      <FormError message={state.error} />
      {esEdicion && <input type="hidden" name="id" value={valoresIniciales!.id} />}
      {state.success && (
        <p className="rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700 dark:border-green-800 dark:bg-green-950/30 dark:text-green-300">
          Proveedor agregado.
        </p>
      )}

      <Field
        label="Nombre / Empresa"
        name="nombre"
        defaultValue={state.values?.nombre ?? valoresIniciales?.nombre}
        required
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field
          label="Contacto"
          name="contacto"
          defaultValue={state.values?.contacto ?? valoresIniciales?.contacto ?? undefined}
          placeholder="Nombre de la persona"
        />
        <Field
          label="Teléfono"
          name="telefono"
          defaultValue={state.values?.telefono ?? valoresIniciales?.telefono ?? undefined}
        />
        <Field
          label="Correo"
          name="correo"
          type="email"
          defaultValue={state.values?.correo ?? valoresIniciales?.correo ?? undefined}
        />
        <Field
          label="Dirección"
          name="direccion"
          defaultValue={state.values?.direccion ?? valoresIniciales?.direccion ?? undefined}
        />
        <Field
          label="RUC"
          name="ruc"
          defaultValue={state.values?.ruc ?? valoresIniciales?.ruc ?? undefined}
        />
        <Field
          label="DV"
          name="dv"
          defaultValue={state.values?.dv ?? valoresIniciales?.dv ?? undefined}
        />
      </div>

      <Field
        label="Nota"
        name="nota"
        defaultValue={state.values?.nota ?? valoresIniciales?.nota ?? undefined}
        placeholder="Opcional"
      />

      <div className="flex gap-3">
        <SubmitButton>{esEdicion ? "Guardar cambios" : "+ Agregar proveedor"}</SubmitButton>
        {esEdicion && (
          <LinkButton href="/compras/proveedores" variant="secondary">
            Cancelar
          </LinkButton>
        )}
      </div>
    </form>
  );
}
