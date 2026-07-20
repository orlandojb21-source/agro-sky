"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { biometricoRegistrado, desbloquearConBiometrico, esMobil } from "@/lib/webauthn";

type Estado = "cargando" | "desbloqueando" | "error";

export default function SplashPage() {
  const router = useRouter();
  const [estado, setEstado] = useState<Estado>("cargando");
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    const timer = setTimeout(async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.replace("/login");
        return;
      }

      if (!esMobil() || !biometricoRegistrado(session.user.id)) {
        router.replace("/inventario/nuevos");
        return;
      }

      setUserId(session.user.id);
      setEstado("desbloqueando");
      const ok = await desbloquearConBiometrico(session.user.id);
      if (ok) {
        router.replace("/inventario/nuevos");
      } else {
        setEstado("error");
      }
    }, 1100);

    return () => clearTimeout(timer);
  }, [router]);

  async function handleReintentar() {
    if (!userId) return;
    setEstado("desbloqueando");
    const ok = await desbloquearConBiometrico(userId);
    if (ok) {
      router.replace("/inventario/nuevos");
    } else {
      setEstado("error");
    }
  }

  async function handleCerrarSesion() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/login");
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-white px-6 dark:bg-[#0a0f0c]">
      <Image
        src="/logo.png"
        alt="Agro Sky Panamá"
        width={200}
        height={200}
        priority
        className="animate-splash"
      />

      {(estado === "desbloqueando" || estado === "error") && (
        <div className="flex w-full max-w-sm flex-col items-center gap-4 rounded-xl border border-green-100 bg-white p-6 text-center shadow-sm dark:border-green-900/40 dark:bg-green-950/10">
          <p className="text-sm text-green-800/80 dark:text-green-200/80">
            {estado === "error"
              ? "No se pudo verificar tu huella o rostro."
              : "Desbloquea con tu huella o rostro para continuar."}
          </p>
          <button
            onClick={handleReintentar}
            disabled={estado === "desbloqueando"}
            className="rounded-full bg-gradient-to-r from-green-600 to-emerald-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {estado === "desbloqueando" ? "Verificando..." : "Reintentar"}
          </button>
          <button
            onClick={handleCerrarSesion}
            className="text-sm text-green-700 hover:underline dark:text-green-300"
          >
            Cerrar sesión y usar contraseña
          </button>
        </div>
      )}
    </main>
  );
}
