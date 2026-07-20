"use client";

import { useActionState } from "react";
import { asignarPasswordAction } from "@/lib/actions/usuarios";
import { Field } from "@/components/ui/Field";
import { FormError } from "@/components/ui/FormError";
import { SubmitButton } from "@/components/ui/Button";

export function AsignarPasswordForm({ id }: { id: string }) {
  const [state, formAction] = useActionState(asignarPasswordAction, {
    error: null,
  });

  return (
    <form
      action={formAction}
      className="flex max-w-md flex-col gap-4 rounded-xl border border-green-100 bg-white p-6 shadow-sm dark:border-green-900/40 dark:bg-green-950/10"
    >
      <h2 className="font-semibold text-green-900 dark:text-green-50">
        Asignar contraseña temporal
      </h2>
      <p className="text-sm text-green-700/70 dark:text-green-200/70">
        Úsalo si el usuario no puede recibir el correo de recuperación.
        Avísale la contraseña por otro medio.
      </p>
      <FormError message={state.error} />
      {state.success && (
        <p className="rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700 dark:border-green-800 dark:bg-green-950/30 dark:text-green-300">
          Contraseña asignada.
        </p>
      )}
      <input type="hidden" name="id" value={id} />
      <Field
        label="Nueva contraseña"
        name="password"
        type="password"
        placeholder="Mínimo 8 caracteres"
        required
      />
      <SubmitButton>Asignar contraseña</SubmitButton>
    </form>
  );
}
