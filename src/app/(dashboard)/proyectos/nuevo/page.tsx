import { requireSection } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { ProyectoInformeForm } from "@/components/forms/ProyectoInformeForm";

export default async function NuevoInformeProyectoPage() {
  await requireSection("proyectos");

  const hoy = new Date();
  const fechaHoy = hoy.toISOString().slice(0, 10);
  const hasta = new Date(hoy);
  hasta.setDate(hasta.getDate() + 6);
  const fechaHastaSugerida = hasta.toISOString().slice(0, 10);

  const supabase = await createClient();
  const { data: colaboradoresData } = await supabase
    .from("colaboradores")
    .select("nombre")
    .eq("tipo", "campo")
    .order("nombre");

  const colaboradoresCampo = (colaboradoresData ?? []).map((c) => c.nombre as string);

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-green-900 dark:text-green-50">
        Nuevo informe de proyecto
      </h1>
      <ProyectoInformeForm
        fechaHoy={fechaHoy}
        fechaHastaSugerida={fechaHastaSugerida}
        colaboradoresCampo={colaboradoresCampo}
      />
    </div>
  );
}
