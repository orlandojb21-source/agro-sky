"use client";

import { useActionState } from "react";
import { crearRackAction } from "@/lib/actions/racks";
import { Field } from "@/components/ui/Field";
import { FormError } from "@/components/ui/FormError";
import { SubmitButton } from "@/components/ui/Button";

export function RackForm() {
  const [state, formAction] = useActionState(crearRackAction, { error: null });

  return (
    <form
      action={formAction}
      className="flex flex-col gap-3 rounded-xl border border-green-100 bg-white p-4 shadow-sm dark:border-green-900/40 dark:bg-green-950/10"
    >
      <FormError message={state.error} />
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-[200px] flex-1">
          <Field label="Nuevo rack" name="nombre" placeholder="Ej: Rack A" required />
        </div>
        <SubmitButton>Agregar rack</SubmitButton>
      </div>
    </form>
  );
}
