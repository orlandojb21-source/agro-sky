import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// Cliente con la service_role key: solo se importa desde Server Actions,
// nunca llega al bundle del navegador ("server-only" lo garantiza en build).
// Se usa exclusivamente para gestionar cuentas (Authentication Admin API),
// que la anon key no puede hacer.
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}
