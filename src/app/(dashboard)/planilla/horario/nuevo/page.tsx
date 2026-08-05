import { requireWrite } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { ControlHorarioForm } from "@/components/forms/ControlHorarioForm";

export default async function NuevoControlHorarioPage() {
  await requireWrite("planilla");

  const supabase = await createClient();
  const { data } = await supabase.from("colaboradores").select("nombre").eq("tipo", "fijo").order("nombre");
  const colaboradores = (data ?? []).map((c) => ({ nombre: c.nombre as string }));

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold text-green-900 dark:text-green-50">Nuevo registro de horario</h1>
      <ControlHorarioForm fechaHoy={new Date().toISOString().slice(0, 10)} colaboradores={colaboradores} />
    </div>
  );
}
