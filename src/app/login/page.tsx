"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { Logo } from "@/components/ui/Logo";

// Recuerda el ultimo correo usado en este dispositivo para precargarlo si
// la sesion se pierde (iOS a veces borra las cookies de sesion de apps
// instaladas en la pantalla de inicio, un problema conocido del sistema,
// no de esta app: https://bugs.webkit.org/show_bug.cgi?id=272325). No es
// un dato sensible, solo ahorra tener que volver a escribir el correo.
const ULTIMO_CORREO_KEY = "agro-sky-ultimo-correo";

export default function LoginPage() {
  const router = useRouter();
  const [modo, setModo] = useState<"login" | "olvide" | "enviado">("login");
  const [email, setEmail] = useState(() =>
    typeof window === "undefined" ? "" : localStorage.getItem(ULTIMO_CORREO_KEY) ?? "",
  );
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);

    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      setError("Correo o contraseña incorrectos.");
      setPending(false);
      return;
    }

    localStorage.setItem(ULTIMO_CORREO_KEY, email);
    router.replace("/inventario/nuevos");
    router.refresh();
  }

  async function handleOlvide(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);

    const supabase = createClient();
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(
      email,
      { redirectTo: `${window.location.origin}/actualizar-password` },
    );
    setPending(false);

    if (resetError) {
      setError("No se pudo enviar el correo. Intenta de nuevo.");
      return;
    }

    setModo("enviado");
  }

  if (modo === "enviado") {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-8 bg-white px-6 dark:bg-[#0a0f0c]">
        <Logo width={140} height={140} priority />
        <div className="flex w-full max-w-sm flex-col gap-3 rounded-xl border border-green-100 bg-white p-6 text-center shadow-sm dark:border-green-900/40 dark:bg-green-950/10">
          <h1 className="text-lg font-semibold text-green-900 dark:text-green-50">
            Revisa tu correo
          </h1>
          <p className="text-sm text-green-800/80 dark:text-green-200/80">
            Si <strong>{email}</strong> tiene una cuenta en Agro Sky, te enviamos un enlace para elegir una nueva contraseña.
          </p>
          <button
            onClick={() => setModo("login")}
            className="mt-2 text-sm text-green-700 hover:underline dark:text-green-300"
          >
            Volver a iniciar sesión
          </button>
        </div>
      </main>
    );
  }

  if (modo === "olvide") {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-8 bg-white px-6 dark:bg-[#0a0f0c]">
        <Logo width={140} height={140} priority />
        <form
          onSubmit={handleOlvide}
          className="flex w-full max-w-sm flex-col gap-4 rounded-xl border border-green-100 bg-white p-6 shadow-sm dark:border-green-900/40 dark:bg-green-950/10"
        >
          <h1 className="text-center text-lg font-semibold text-green-900 dark:text-green-50">
            Recuperar contraseña
          </h1>

          {error && (
            <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
              {error}
            </p>
          )}

          <label className="flex flex-col gap-1 text-sm text-green-900 dark:text-green-100">
            Correo
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="username"
              className="rounded-lg border border-green-200 bg-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-600 dark:border-green-800 dark:bg-green-950/30"
            />
          </label>

          <button
            type="submit"
            disabled={pending}
            className="rounded-full bg-gradient-to-r from-green-600 to-emerald-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {pending ? "Enviando..." : "Enviar enlace"}
          </button>
          <button
            type="button"
            onClick={() => {
              setError(null);
              setModo("login");
            }}
            className="text-sm text-green-700 hover:underline dark:text-green-300"
          >
            Volver a iniciar sesión
          </button>
        </form>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 bg-white px-6 dark:bg-[#0a0f0c]">
      <Logo width={140} height={140} priority />

      <form
        onSubmit={handleSubmit}
        className="flex w-full max-w-sm flex-col gap-4 rounded-xl border border-green-100 bg-white p-6 shadow-sm dark:border-green-900/40 dark:bg-green-950/10"
      >
        <h1 className="text-center text-lg font-semibold text-green-900 dark:text-green-50">
          Iniciar sesión
        </h1>

        {error && (
          <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
            {error}
          </p>
        )}

        <label className="flex flex-col gap-1 text-sm text-green-900 dark:text-green-100">
          Correo
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="username"
            className="rounded-lg border border-green-200 bg-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-600 dark:border-green-800 dark:bg-green-950/30"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm text-green-900 dark:text-green-100">
          Contraseña
          <PasswordInput
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
            className="rounded-lg border border-green-200 bg-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-600 dark:border-green-800 dark:bg-green-950/30"
          />
        </label>

        <button
          type="submit"
          disabled={pending}
          className="rounded-full bg-gradient-to-r from-green-600 to-emerald-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {pending ? "Entrando..." : "Entrar"}
        </button>
        <button
          type="button"
          onClick={() => {
            setError(null);
            setModo("olvide");
          }}
          className="text-sm text-green-700 hover:underline dark:text-green-300"
        >
          ¿Olvidaste tu contraseña?
        </button>
      </form>
    </main>
  );
}
