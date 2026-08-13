import { notFound, redirect } from "next/navigation";
import { requireWrite } from "@/lib/session";
import { puedeGestionarDrones } from "@/lib/roles";
import { createClient } from "@/lib/supabase/server";
import { DroneForm } from "@/components/forms/DroneForm";
import type { EstadoDrone } from "@/lib/validation/drones";

export default async function EditarDronePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const perfil = await requireWrite("bitacora");
  if (!puedeGestionarDrones(perfil.rol)) redirect("/unauthorized");

  const supabase = await createClient();
  const [{ data: drone }, { data: colaboradoresData }] = await Promise.all([
    supabase
      .from("drones")
      .select(
        "id, nombre, modelo, fecha_activacion, numero_serie_aeronave, numero_serie_placa_fc, numero_serie_fabrica, estado, estado_detalle",
      )
      .eq("id", id)
      .maybeSingle(),
    supabase.from("colaboradores").select("nombre").eq("tipo", "campo").order("nombre"),
  ]);

  if (!drone) notFound();

  const colaboradoresCampo = (colaboradoresData ?? []).map((c) => c.nombre as string);

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-green-900 dark:text-green-50">Editar drone</h1>
      <DroneForm
        colaboradoresCampo={colaboradoresCampo}
        puedeAsignarOperador={false}
        valoresIniciales={{
          id: drone.id as string,
          nombre: drone.nombre as string,
          modelo: drone.modelo as string,
          fechaActivacion: drone.fecha_activacion as string | null,
          numeroSerieAeronave: drone.numero_serie_aeronave as string | null,
          numeroSeriePlacaFc: drone.numero_serie_placa_fc as string | null,
          numeroSerieFabrica: drone.numero_serie_fabrica as string | null,
          estado: drone.estado as EstadoDrone,
          estadoDetalle: drone.estado_detalle as string | null,
        }}
      />
    </div>
  );
}
