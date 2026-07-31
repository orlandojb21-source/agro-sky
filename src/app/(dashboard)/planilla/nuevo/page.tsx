import { requireSection } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { AsistenciaForm } from "@/components/forms/AsistenciaForm";

export default async function NuevaAsistenciaPage() {
  await requireSection("planilla");

  const supabase = await createClient();
  const { data } = await supabase
    .from("colaboradores")
    .select("nombre")
    .eq("tipo", "campo")
    .order("nombre");
  const colaboradores = (data ?? []).map((c) => ({ nombre: c.nombre as string }));

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-green-900 dark:text-green-50">
        Nueva asistencia
      </h1>
      <AsistenciaForm fechaHoy={new Date().toISOString().slice(0, 10)} colaboradores={colaboradores} />
    </div>
  );
}
