"use client";

import { useActionState } from "react";
import { actualizarPerfilAction } from "@/lib/actions/perfil";
import { Field } from "@/components/ui/Field";
import { FormError } from "@/components/ui/FormError";
import { SubmitButton } from "@/components/ui/Button";

export function PerfilForm({
  nombreCompleto,
  telefono,
}: {
  nombreCompleto: string;
  telefono: string | null;
}) {
  const [state, formAction] = useActionState(actualizarPerfilAction, {
    error: null,
  });

  return (
    <form
      action={formAction}
      className="flex max-w-md flex-col gap-4 rounded-xl border border-green-100 bg-white p-6 shadow-sm dark:border-green-900/40 dark:bg-green-950/10"
    >
      <h2 className="font-semibold text-green-900 dark:text-green-50">
        Datos básicos
      </h2>
      <FormError message={state.error} />
      {state.success && (
        <p className="rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700 dark:border-green-800 dark:bg-green-950/30 dark:text-green-300">
          Datos guardados.
        </p>
      )}
      <Field
        label="Nombre completo"
        name="nombreCompleto"
        defaultValue={nombreCompleto}
        required
      />
      <Field
        label="Teléfono"
        name="telefono"
        defaultValue={telefono ?? ""}
        placeholder="Opcional"
      />
      <SubmitButton>Guardar datos</SubmitButton>
    </form>
  );
}
