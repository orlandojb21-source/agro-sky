import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Rol } from "@/lib/roles";

export type PerfilActual = {
  id: string;
  nombreCompleto: string;
  rol: Rol;
  email: string;
};

export async function getPerfilActual(): Promise<PerfilActual | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: perfil } = await supabase
    .from("perfiles")
    .select("id, nombre_completo, rol")
    .eq("id", user.id)
    .maybeSingle();

  if (!perfil) return null;

  return {
    id: perfil.id,
    nombreCompleto: perfil.nombre_completo,
    rol: perfil.rol as Rol,
    email: user.email ?? "",
  };
}
