"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { crearProyectoCatalogoAction, editarProyectoCatalogoAction } from "@/lib/actions/proyectosCatalogo";
import { Field, SelectField } from "@/components/ui/Field";
import { FormError } from "@/components/ui/FormError";
import { SubmitButton, LinkButton } from "@/components/ui/Button";

type ValoresProyectoCatalogo = {
  id?: string;
  codigo?: string;
  nombre: string;
  clienteId: string;
  tipoProyecto: "ingenio_santa_rosa" | "particular";
  estado: "abierto" | "cerrado";
};

export function ProyectoCatalogoForm({
  clientes,
  valoresIniciales,
}: {
  clientes: { id: string; nombre: string }[];
  valoresIniciales?: ValoresProyectoCatalogo;
}) {
  const esEdicion = Boolean(valoresIniciales?.id);
  const [state, formAction] = useActionState(
    esEdicion ? editarProyectoCatalogoAction : crearProyectoCatalogoAction,
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

      {esEdicion ? (
        <div className="flex flex-col gap-1 text-sm text-green-900 dark:text-green-100">
          Código
          <p className="rounded-lg border border-green-100 bg-green-50/60 px-3 py-2 text-green-800/80 dark:border-green-900/40 dark:bg-green-950/20 dark:text-green-200/80">
            {valoresIniciales?.codigo}
          </p>
        </div>
      ) : (
        <p className="text-xs text-green-700/60 dark:text-green-300/60">
          El código se asigna automáticamente al guardar.
        </p>
      )}

      <Field
        label="Nombre del proyecto"
        name="nombre"
        defaultValue={v?.nombre ?? valoresIniciales?.nombre ?? undefined}
        required
      />

      <SelectField
        label="Cliente"
        name="clienteId"
        defaultValue={v?.clienteId ?? valoresIniciales?.clienteId ?? ""}
        required
      >
        <option value="">Selecciona...</option>
        {clientes.map((c) => (
          <option key={c.id} value={c.id}>
            {c.nombre}
          </option>
        ))}
      </SelectField>

      <SelectField
        label="Tipo de proyecto"
        name="tipoProyecto"
        defaultValue={v?.tipoProyecto ?? valoresIniciales?.tipoProyecto ?? "particular"}
        required
      >
        <option value="ingenio_santa_rosa">Ingenio Santa Rosa</option>
        <option value="particular">Trabajo Particular</option>
      </SelectField>

      <SelectField
        label="Estado"
        name="estado"
        defaultValue={v?.estado ?? valoresIniciales?.estado ?? "abierto"}
        required
      >
        <option value="abierto">Abierto</option>
        <option value="cerrado">Cerrado</option>
      </SelectField>

      {clientes.length === 0 && (
        <p className="text-xs text-amber-700 dark:text-amber-400">
          Todavía no hay ningún cliente registrado —{" "}
          <Link href="/ventas/clientes/nuevo" className="underline">
            crea uno primero
          </Link>
          .
        </p>
      )}

      <div className="flex gap-3">
        <SubmitButton disabled={clientes.length === 0}>Guardar</SubmitButton>
        <LinkButton href="/informes/proyectos" variant="secondary">
          Cancelar
        </LinkButton>
      </div>
    </form>
  );
}
