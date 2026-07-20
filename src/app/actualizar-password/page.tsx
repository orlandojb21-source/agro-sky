"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function ActualizarPasswordPage() {
  const router = useRouter();
  const [listo, setListo] = useState(false);
  const [tieneSesion, setTieneSesion] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [exito, setExito] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data: { session } }) => {
      setTieneSesion(Boolean(session));
      setListo(true);
    });
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

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
      setError("No se pudo actualizar la contraseña. Intenta de nuevo.");
      return;
    }

    setExito(true);
    setTimeout(() => {
      router.replace("/inventario/nuevos");
      router.refresh();
    }, 1500);
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 bg-white px-6 dark:bg-[#0a0f0c]">
      <Image src="/logo.png" alt="Agro Sky Panamá" width={140} height={140} priority />

      <div className="flex w-full max-w-sm flex-col gap-4 rounded-xl border border-green-100 bg-white p-6 shadow-sm dark:border-green-900/40 dark:bg-green-950/10">
        {!listo ? (
          <p className="text-center text-sm text-green-700/70 dark:text-green-200/70">
            Cargando...
          </p>
        ) : !tieneSesion ? (
          <>
            <h1 className="text-center text-lg font-semibold text-green-900 dark:text-green-50">
              Enlace vencido
            </h1>
            <p className="text-center text-sm text-green-800/80 dark:text-green-200/80">
              Este enlace ya expiró o no es válido. Pide uno nuevo desde la pantalla de inicio de sesión.
            </p>
          </>
        ) : exito ? (
          <p className="text-center text-sm text-green-800/80 dark:text-green-200/80">
            Contraseña actualizada. Entrando...
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <h1 className="text-center text-lg font-semibold text-green-900 dark:text-green-50">
              Elige una nueva contraseña
            </h1>

            {error && (
              <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
                {error}
              </p>
            )}

            <label className="flex flex-col gap-1 text-sm text-green-900 dark:text-green-100">
              Nueva contraseña
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="new-password"
                className="rounded-lg border border-green-200 bg-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-600 dark:border-green-800 dark:bg-green-950/30"
              />
            </label>

            <label className="flex flex-col gap-1 text-sm text-green-900 dark:text-green-100">
              Confirmar contraseña
              <input
                type="password"
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
              className="rounded-full bg-gradient-to-r from-green-600 to-emerald-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {pending ? "Guardando..." : "Guardar contraseña"}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
