"use server";

import { revalidatePath } from "next/cache";
import { requireWrite } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import type { ContextoCategoriaGasto, TipoCategoriaCompra } from "@/lib/categorias";

const SECCION_POR_CONTEXTO = {
  caja_menuda: "gastos-operativos",
  compras: "gastos-operativos",
} as const;

// Se llama directo desde el formulario del gasto (botón "+ Agregar
// categoría nueva", no un <form> aparte) -- mismo patrón que
// subirFotoColaboradorAction: una función simple que devuelve el
// resultado o lanza un error, no un reducer de useActionState. Cualquiera
// que ya pueda registrar un gasto en esa sección puede agregar categorías
// (pedido explícito del usuario, 2026-08-07) -- mismo requireWrite que ya
// protege crear el gasto, sin rol aparte.
//
// "tipo" (Fijo/Variable) solo aplica a contexto="compras" -- alimenta el
// cuadro "Vista mensual de gastos" de Balance (pedido del usuario,
// 2026-08-13). Se exige acá, en el servidor, no solo en el formulario.
export async function crearCategoriaGastoAction(
  contexto: ContextoCategoriaGasto,
  nombre: string,
  tipo?: TipoCategoriaCompra,
): Promise<string> {
  const perfil = await requireWrite(SECCION_POR_CONTEXTO[contexto]);
  const nombreLimpio = nombre.trim();
  if (!nombreLimpio) throw new Error("Escribe un nombre para la categoría.");
  if (contexto === "compras" && tipo !== "fijo" && tipo !== "variable") {
    throw new Error("Selecciona si la categoría es Fija o Variable.");
  }

  const supabase = await createClient();

  const { data: existentes } = await supabase
    .from("categorias_gasto")
    .select("nombre")
    .eq("contexto", contexto);
  const yaExiste = (existentes ?? []).some(
    (c) => (c.nombre as string).toLowerCase() === nombreLimpio.toLowerCase(),
  );
  if (yaExiste) throw new Error("Ya existe una categoría con ese nombre.");

  const { error } = await supabase.from("categorias_gasto").insert({
    contexto,
    nombre: nombreLimpio,
    tipo: contexto === "compras" ? tipo : null,
    registrado_por: perfil.id,
  });
  if (error) throw new Error("No se pudo agregar la categoría. Intenta de nuevo.");

  revalidatePath("/gastos-operativos");
  revalidatePath("/gastos-operativos/gastos");
  revalidatePath("/balance");
  return nombreLimpio;
}
