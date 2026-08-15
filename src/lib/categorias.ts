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
    .order("nombre");
  return (data ?? []).map((c) => c.nombre as string);
}

export type TipoCategoriaCompra = "fijo" | "variable";

// Solo Compras > Gastos se agrupa en "Gastos Fijos"/"Gastos Variables"
// (ver cuadro "Vista mensual de gastos" en Balance) -- Caja Menuda no
// necesita este dato, sigue usando obtenerCategoriasGasto() de arriba.
export async function obtenerCategoriasCompraConTipo(
  supabase: SupabaseServerClient,
): Promise<{ nombre: string; tipo: TipoCategoriaCompra }[]> {
  const { data } = await supabase
    .from("categorias_gasto")
    .select("nombre, tipo")
    .eq("contexto", "compras")
    .order("nombre");
  // "tipo" es nullable en la base (migración 0084) solo para no romper
  // una categoría vieja que por algún motivo no se haya clasificado --
  // en la práctica crearCategoriaGastoAction exige "tipo" para cualquier
  // categoría nueva de Compras, así que no debería pasar nunca. Si
  // pasara, se agrupa como "variable" (mismo criterio que "otro"/"Caja
  // de Seguro Social" en la migración 0084) para no perderla del cuadro.
  return (data ?? []).map((c) => ({
    nombre: c.nombre as string,
    tipo: (c.tipo as TipoCategoriaCompra | null) ?? "variable",
  }));
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
