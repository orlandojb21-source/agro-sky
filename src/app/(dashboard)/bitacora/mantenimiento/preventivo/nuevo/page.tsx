import { requireWrite } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { PreventivoMantenimientoForm } from "@/components/forms/PreventivoMantenimientoForm";

export default async function NuevoMantenimientoPreventivoPage({
  searchParams,
}: {
  searchParams: Promise<{ drone?: string }>;
}) {
  const { drone: droneIdInicial } = await searchParams;
  await requireWrite("bitacora");

  const supabase = await createClient();
  const { data } = await supabase
    .from("drones")
    .select("id, nombre, modelo, horas_vuelo, area_cubierta, vuelos")
    .order("nombre");

  const drones = (data ?? []).map((d) => ({
    id: d.id as string,
    nombre: d.nombre as string,
    modelo: d.modelo as string,
    horasVuelo: Number(d.horas_vuelo),
    areaCubierta: Number(d.area_cubierta),
    vuelos: d.vuelos as number,
  }));

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-green-900 dark:text-green-50">
        Nuevo mantenimiento preventivo
      </h1>
      <PreventivoMantenimientoForm
        drones={drones}
        fechaHoy={new Date().toISOString().slice(0, 10)}
        droneIdInicial={droneIdInicial}
      />
    </div>
  );
}
