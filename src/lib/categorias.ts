import type { createClient } from "@/lib/supabase/server";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

// Caja Menuda y Compras > Gastos tienen cada una su propia lista de
// categorías (no se mezclan) -- ambas viven en la misma tabla
// "categorias_gasto", distinguidas por "contexto", administrable desde
// el propio formulario del gasto ("+ Agregar categoría nueva") en vez de
// una lista fija en el código (ver migración 0068).
export type ContextoCategoriaGasto = "caja_menuda" | "compras";

export async function obtenerCategoriasGasto(
  supabase: SupabaseServerClient,
  contexto: ContextoCategoriaGasto,
): Promise<string[]> {
  const { data } = await supabase
    .from("categorias_gasto")
    .select("nombre")
    .eq("contexto", contexto)
    .order("creado_en", { ascending: true });
  return (data ?? []).map((c) => c.nombre as string);
}

// Reemplaza el "check" que antes vivía en la base de datos (ver migración
// 0068) -- ahora que la lista es administrable, se valida contra
// categorias_gasto en vez de un enum fijo.
export async function categoriaGastoValida(
  supabase: SupabaseServerClient,
  contexto: ContextoCategoriaGasto,
  nombre: string,
): Promise<boolean> {
  const { data } = await supabase
    .from("categorias_gasto")
    .select("id")
    .eq("contexto", contexto)
    .eq("nombre", nombre)
    .maybeSingle();
  return data !== null;
}
