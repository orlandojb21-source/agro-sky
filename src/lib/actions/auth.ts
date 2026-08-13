"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export type IniciarSesionResultado = { error: string } | { ok: true };

// El login se movió a un Server Action (antes iba directo del navegador a
// Supabase con la anon key) para poder contar los intentos fallidos por
// cuenta y bloquearla 15 minutos después del 5to intento seguido --
// recomendación de la revisión de seguridad (SECURITY_REVIEW.md, 1.6).
// Supabase Auth no ofrece esto de fábrica, ver migración 0086.
export async function iniciarSesionAction(
  email: string,
  password: string,
): Promise<IniciarSesionResultado> {
  const correo = email.trim().toLowerCase();
  const admin = createAdminClient();

  const { data: fila } = await admin
    .from("login_intentos")
    .select("bloqueado_hasta")
    .eq("email", correo)
    .maybeSingle();

  if (fila?.bloqueado_hasta) {
    const bloqueadoHasta = new Date(fila.bloqueado_hasta as string);
    if (bloqueadoHasta > new Date()) {
      const minutosRestantes = Math.ceil((bloqueadoHasta.getTime() - Date.now()) / 60000);
      return {
        error: `Demasiados intentos fallidos. Intenta de nuevo en ${minutosRestantes} minuto${minutosRestantes === 1 ? "" : "s"}.`,
      };
    }
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email: correo, password });

  if (error) {
    await admin.rpc("registrar_intento_login_fallido", { p_email: correo });
    return { error: "Correo o contraseña incorrectos." };
  }

  await admin.rpc("limpiar_intentos_login", { p_email: correo });
  return { ok: true };
}
