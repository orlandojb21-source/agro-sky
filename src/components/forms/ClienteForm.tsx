"use client";

import { useActionState, useState } from "react";
import { crearClienteAction, editarClienteAction } from "@/lib/actions/clientes";
import { Field } from "@/components/ui/Field";
import { FormError } from "@/components/ui/FormError";
import { SubmitButton, LinkButton } from "@/components/ui/Button";

type ValoresCliente = {
  id?: string;
  nombre: string;
  cedula: string | null;
  ruc: string | null;
  rucDv: string | null;
  telefono: string | null;
  direccion: string | null;
  correo: string | null;
};

export function ClienteForm({ valoresIniciales }: { valoresIniciales?: ValoresCliente }) {
  const esEdicion = Boolean(valoresIniciales?.id);
  const [state, formAction] = useActionState(
    esEdicion ? editarClienteAction : crearClienteAction,
    { error: null },
  );

  const [prevState, setPrevState] = useState(state);
  const [remountKey, setRemountKey] = useState(0);
  if (state !== prevState) {
    setPrevState(state);
    setRemountKey((k) => k + 1);
  }

  const v = state.values;

  return (
    <form
      key={remountKey}
      action={formAction}
      className="flex max-w-xl flex-col gap-4 rounded-xl border border-green-100 bg-white p-6 shadow-sm dark:border-green-900/40 dark:bg-green-950/10"
    >
      <FormError message={state.error} />
      {esEdicion && <input type="hidden" name="id" value={valoresIniciales!.id} />}

      <Field
        label="Nombre"
        name="nombre"
        defaultValue={v?.nombre ?? valoresIniciales?.nombre ?? undefined}
        required
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field
          label="Cédula"
          name="cedula"
          defaultValue={v?.cedula ?? valoresIniciales?.cedula ?? undefined}
        />
        <Field
          label="Teléfono"
          name="telefono"
          defaultValue={v?.telefono ?? valoresIniciales?.telefono ?? undefined}
        />
        <Field label="RUC" name="ruc" defaultValue={v?.ruc ?? valoresIniciales?.ruc ?? undefined} />
        <Field
          label="DV"
          name="rucDv"
          defaultValue={v?.rucDv ?? valoresIniciales?.rucDv ?? undefined}
        />
      </div>

      <Field
        label="Dirección"
        name="direccion"
        defaultValue={v?.direccion ?? valoresIniciales?.direccion ?? undefined}
      />
      <Field
        label="Correo"
        name="correo"
        type="email"
        defaultValue={v?.correo ?? valoresIniciales?.correo ?? undefined}
      />

      <div className="flex gap-3">
        <SubmitButton>Guardar</SubmitButton>
        <LinkButton href="/informes/clientes" variant="secondary">
          Cancelar
        </LinkButton>
      </div>
    </form>
  );
}
