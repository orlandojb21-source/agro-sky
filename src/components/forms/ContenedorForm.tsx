"use client";

import { useActionState } from "react";
import { crearContenedorAction } from "@/lib/actions/racks";
import { FormError } from "@/components/ui/FormError";
import { SubmitButton } from "@/components/ui/Button";

export function ContenedorForm({ rackId }: { rackId: string }) {
  const [state, formAction] = useActionState(crearContenedorAction, {
    error: null,
  });

  return (
    <form action={formAction} className="flex flex-col gap-2">
      <FormError message={state.error} />
      <div className="flex flex-wrap items-center gap-2">
        <input type="hidden" name="rackId" value={rackId} />
        <input
          name="nombre"
          placeholder="Nuevo contenedor"
          required
          className="rounded-lg border border-green-200 bg-white px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-600 dark:border-green-800 dark:bg-green-950/30"
        />
        <SubmitButton className="px-3 py-1.5 text-xs">
          + Agregar contenedor
        </SubmitButton>
      </div>
    </form>
  );
}
