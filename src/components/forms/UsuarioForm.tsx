"use client";

import { useActionState } from "react";
import { crearUsuarioAction } from "@/lib/actions/usuarios";
import { Field, SelectField } from "@/components/ui/Field";
import { FormError } from "@/components/ui/FormError";
import { SubmitButton } from "@/components/ui/Button";
import { ROLES, ROL_LABEL } from "@/lib/roles";

export function UsuarioForm() {
  const [state, formAction] = useActionState(crearUsuarioAction, {
    error: null,
  });

  return (
    <form
      action={formAction}
      className="flex max-w-md flex-col gap-4 rounded-xl border border-green-100 bg-white p-6 shadow-sm dark:border-green-900/40 dark:bg-green-950/10"
    >
      <FormError message={state.error} />
      <Field label="Nombre completo" name="nombreCompleto" required />
      <Field label="Correo" name="email" type="email" required />
      <Field
        label="Contraseña temporal"
        name="password"
        type="password"
        required
        placeholder="Mínimo 8 caracteres"
      />
      <SelectField label="Rol" name="rol" required defaultValue="soporte">
        {ROLES.map((r) => (
          <option key={r} value={r}>
            {ROL_LABEL[r]}
          </option>
        ))}
      </SelectField>
      <SubmitButton>Crear usuario</SubmitButton>
    </form>
  );
}
