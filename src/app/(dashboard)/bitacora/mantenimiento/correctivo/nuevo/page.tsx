import { requireWrite } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { CorrectivoMantenimientoForm } from "@/components/forms/CorrectivoMantenimientoForm";

export default async function NuevoMantenimientoCorrectivoPage({
  searchParams,
}: {
  searchParams: Promise<{ drone?: string }>;
}) {
  const { drone: droneIdInicial } = await searchParams;
  await requireWrite("bitacora");

  const supabase = await createClient();
  const [{ data: dronesData }, { data: productosData }] = await Promise.all([
    supabase.from("drones").select("id, nombre, modelo").order("nombre"),
    supabase
      .from("productos")
      .select("id, numero_parte, descripcion, cantidad, tipo")
      .order("numero_parte"),
  ]);

  const drones = (dronesData ?? []).map((d) => ({
    id: d.id as string,
    nombre: d.nombre as string,
    modelo: d.modelo as string,
  }));
  const productos = (productosData ?? []).map((p) => ({
    id: p.id as string,
    numeroParte: p.numero_parte as string,
    descripcion: p.descripcion as string,
    cantidad: p.cantidad as number,
    tipo: p.tipo as "nuevo" | "usado",
  }));

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-green-900 dark:text-green-50">
        Nuevo mantenimiento correctivo
      </h1>
      <CorrectivoMantenimientoForm
        drones={drones}
        productos={productos}
        fechaHoy={new Date().toISOString().slice(0, 10)}
        droneIdInicial={droneIdInicial}
      />
    </div>
  );
}
