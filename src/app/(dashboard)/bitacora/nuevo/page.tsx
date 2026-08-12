import { requireWrite } from "@/lib/session";
import { puedeReasignarOperadorDrone } from "@/lib/roles";
import { createClient } from "@/lib/supabase/server";
import { DroneForm } from "@/components/forms/DroneForm";

export default async function NuevoDronePage() {
  const perfil = await requireWrite("bitacora");

  const supabase = await createClient();
  const { data } = await supabase.from("colaboradores").select("nombre").eq("tipo", "campo").order("nombre");
  const colaboradoresCampo = (data ?? []).map((c) => c.nombre as string);

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-green-900 dark:text-green-50">Nuevo drone</h1>
      <DroneForm
        colaboradoresCampo={colaboradoresCampo}
        puedeAsignarOperador={puedeReasignarOperadorDrone(perfil.rol)}
      />
    </div>
  );
}
