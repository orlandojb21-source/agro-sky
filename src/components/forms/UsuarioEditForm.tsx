"use client";

import { useActionState } from "react";
import { actualizarUsuarioAction } from "@/lib/actions/usuarios";
import { Field, SelectField } from "@/components/ui/Field";
import { FormError } from "@/components/ui/FormError";
import { SubmitButton } from "@/components/ui/Button";
import { ROLES, ROL_LABEL, type Rol } from "@/lib/roles";

export function UsuarioEditForm({
  id,
  nombreCompleto,
  email,
  rol,
}: {
  id: string;
  nombreCompleto: string;
  email: string;
  rol: Rol;
}) {
  const [state, formAction] = useActionState(actualizarUsuarioAction, {
    error: null,
  });

  return (
    <form
      action={formAction}
      className="flex max-w-md flex-col gap-4 rounded-xl border border-green-100 bg-white p-6 shadow-sm dark:border-green-900/40 dark:bg-green-950/10"
    >
      <h2 className="font-semibold text-green-900 dark:text-green-50">
        Datos del usuario
      </h2>
      <FormError message={state.error} />
      <input type="hidden" name="id" value={id} />
      <Field
        label="Nombre completo"
        name="nombreCompleto"
        defaultValue={nombreCompleto}
        required
      />
      <Field label="Correo" name="email" type="email" defaultValue={email} required />
      <SelectField label="Rol" name="rol" required defaultValue={rol}>
        {ROLES.map((r) => (
          <option key={r} value={r}>
            {ROL_LABEL[r]}
          </option>
        ))}
      </SelectField>
      <SubmitButton>Guardar cambios</SubmitButton>
    </form>
  );
}
