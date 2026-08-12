import { requireWrite } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { RegistroVueloForm } from "@/components/forms/RegistroVueloForm";

export default async function NuevoRegistroVueloPage({
  searchParams,
}: {
  searchParams: Promise<{ drone?: string }>;
}) {
  const { drone: droneIdInicial } = await searchParams;
  await requireWrite("bitacora");

  const supabase = await createClient();
  const [{ data: dronesData }, { data: colaboradoresData }] = await Promise.all([
    supabase.from("drones").select("id, nombre, modelo, area_cubierta, horas_vuelo, vuelos").order("nombre"),
    supabase.from("colaboradores").select("nombre").eq("tipo", "campo").order("nombre"),
  ]);

  const drones = (dronesData ?? []).map((d) => ({
    id: d.id as string,
    nombre: d.nombre as string,
    modelo: d.modelo as string,
    areaCubierta: Number(d.area_cubierta),
    horasVuelo: Number(d.horas_vuelo),
    vuelos: d.vuelos as number,
  }));
  const colaboradoresCampo = (colaboradoresData ?? []).map((c) => c.nombre as string);

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-green-900 dark:text-green-50">Nuevo registro de vuelo</h1>
      <RegistroVueloForm
        drones={drones}
        colaboradoresCampo={colaboradoresCampo}
        fechaHoy={new Date().toISOString().slice(0, 10)}
        droneIdInicial={droneIdInicial}
      />
    </div>
  );
}
