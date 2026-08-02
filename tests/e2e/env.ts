import { readFileSync } from "node:fs";
import path from "node:path";

// Lee .env.local a mano (fuera del runtime de Next.js, este script corre
// como Node plano vía Playwright) -- mismo patrón usado en los scripts de
// verificación manual de este proyecto durante el desarrollo.
function cargarEnvLocal(): Record<string, string> {
  const ruta = path.resolve(__dirname, "../../.env.local");
  const contenido = readFileSync(ruta, "utf8");
  return Object.fromEntries(
    contenido
      .split("\n")
      .filter((l) => l.includes("=") && !l.trim().startsWith("#"))
      .map((l) => {
        const i = l.indexOf("=");
        return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
      }),
  );
}

const env = cargarEnvLocal();

export const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
export const SUPABASE_ANON_KEY = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
export const SUPABASE_SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error(
    "Faltan variables de Supabase en .env.local -- necesarias para armar/limpiar los datos QA de la suite.",
  );
}
