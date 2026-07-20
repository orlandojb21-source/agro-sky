"use client";

import { useActionState } from "react";
import { actualizarRolAction } from "@/lib/actions/usuarios";
import { ROLES, ROL_LABEL, type Rol } from "@/lib/roles";

export function UsuarioRowForm({
  id,
  rolActual,
}: {
  id: string;
  rolActual: Rol;
}) {
  const [state, formAction] = useActionState(actualizarRolAction, {
    error: null,
  });

  return (
    <form action={formAction} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="id" value={id} />
      <select
        name="rol"
        defaultValue={rolActual}
        className="rounded-md border border-green-200 bg-white px-2 py-1 text-xs dark:border-green-800 dark:bg-green-950/30"
      >
        {ROLES.map((r) => (
          <option key={r} value={r}>
            {ROL_LABEL[r]}
          </option>
        ))}
      </select>
      <button
        type="submit"
        className="rounded-md border border-green-200 px-2 py-1 text-xs hover:bg-green-50 dark:border-green-800 dark:hover:bg-green-950/40"
      >
        Guardar
      </button>
      {state.error && (
        <span className="text-xs text-red-600 dark:text-red-400">
          {state.error}
        </span>
      )}
    </form>
  );
}
