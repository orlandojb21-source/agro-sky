import { createClient } from "@/lib/supabase/server";

export type ContenedorSimple = { id: string; nombre: string };

export type RackConContenedores = {
  id: string;
  nombre: string;
  contenedores: ContenedorSimple[];
};

export async function obtenerRacksConContenedores(): Promise<
  RackConContenedores[]
> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("racks")
    .select("id, nombre, contenedores(id, nombre)")
    .order("nombre");

  return (data ?? []).map((rack) => ({
    id: rack.id as string,
    nombre: rack.nombre as string,
    contenedores: ((rack.contenedores ?? []) as ContenedorSimple[]).sort(
      (a, b) => a.nombre.localeCompare(b.nombre),
    ),
  }));
}
