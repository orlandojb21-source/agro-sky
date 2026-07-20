"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { FormError } from "@/components/ui/FormError";
import { PasswordInput } from "@/components/ui/PasswordInput";

export function CambiarPasswordForm() {
  const [password, setPassword] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [exito, setExito] = useState(false);
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setExito(false);

    if (password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres.");
      return;
    }
    if (password !== confirmar) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    setPending(true);
    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setPending(false);

    if (updateError) {
      setError("No se pudo cambiar la contraseña.");
      return;
    }

    setPassword("");
    setConfirmar("");
    setExito(true);
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex max-w-md flex-col gap-4 rounded-xl border border-green-100 bg-white p-6 shadow-sm dark:border-green-900/40 dark:bg-green-950/10"
    >
      <h2 className="font-semibold text-green-900 dark:text-green-50">
        Cambiar contraseña
      </h2>
      <FormError message={error} />
      {exito && (
        <p className="rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700 dark:border-green-800 dark:bg-green-950/30 dark:text-green-300">
          Contraseña actualizada.
        </p>
      )}

      <label className="flex flex-col gap-1 text-sm text-green-900 dark:text-green-100">
        Nueva contraseña
        <PasswordInput
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoComplete="new-password"
          className="rounded-lg border border-green-200 bg-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-600 dark:border-green-800 dark:bg-green-950/30"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm text-green-900 dark:text-green-100">
        Confirmar contraseña
        <PasswordInput
          value={confirmar}
          onChange={(e) => setConfirmar(e.target.value)}
          required
          autoComplete="new-password"
          className="rounded-lg border border-green-200 bg-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-600 dark:border-green-800 dark:bg-green-950/30"
        />
      </label>

      <button
        type="submit"
        disabled={pending}
        className="self-start rounded-full bg-gradient-to-r from-green-600 to-emerald-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {pending ? "Guardando..." : "Cambiar contraseña"}
      </button>
    </form>
  );
}
