"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { biometricoRegistrado } from "@/lib/webauthn";

export function SignOutButton({ userId }: { userId?: string }) {
  const router = useRouter();

  async function handleClick() {
    if (userId && biometricoRegistrado(userId)) {
      // Solo bloquea la app: no destruye la sesion, para que el
      // desbloqueo con huella/rostro pueda volver a abrirla la proxima vez.
      router.replace("/");
      return;
    }

    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  return (
    <button
      onClick={handleClick}
      className="rounded-full border border-green-200 px-3 py-1.5 text-sm text-green-800 hover:bg-green-50 dark:border-green-800 dark:text-green-100 dark:hover:bg-green-950/40"
    >
      Cerrar sesión
    </button>
  );
}
