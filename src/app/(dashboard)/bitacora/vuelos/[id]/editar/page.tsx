import { notFound, redirect } from "next/navigation";
import { requireWrite } from "@/lib/session";
import { esSoporteOJefe } from "@/lib/roles";
import { createClient } from "@/lib/supabase/server";
import { EditarRegistroVueloForm } from "@/components/forms/EditarRegistroVueloForm";

export default async function EditarRegistroVueloPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const perfil = await requireWrite("bitacora");
  if (!esSoporteOJefe(perfil.rol)) redirect("/unauthorized");

  const supabase = await createClient();
  const [{ data: registro }, { data: colaboradoresData }] = await Promise.all([
    supabase
      .from("drones_vuelos")
      .select("id, fecha, operador, horas_vuelo, area_cubierta, vuelos, drones ( nombre, modelo )")
      .eq("id", id)
      .maybeSingle(),
    supabase.from("colaboradores").select("nombre").eq("tipo", "campo").order("nombre"),
  ]);

  if (!registro) notFound();

  const drone = registro.drones as unknown as { nombre: string; modelo: string } | null;
  const colaboradoresCampo = (colaboradoresData ?? []).map((c) => c.nombre as string);

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-green-900 dark:text-green-50">
        Editar registro de vuelo
      </h1>
      <EditarRegistroVueloForm
        colaboradoresCampo={colaboradoresCampo}
        valoresIniciales={{
          id: registro.id as string,
          droneNombre: drone?.nombre ?? "—",
          droneModelo: drone?.modelo ?? "—",
          fecha: registro.fecha as string,
          operador: registro.operador as string,
          horasVuelo: Number(registro.horas_vuelo),
          areaCubierta: Number(registro.area_cubierta),
          vuelos: registro.vuelos as number,
        }}
      />
    </div>
  );
}
