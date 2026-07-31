import { requireSection } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { InformeCampoForm } from "@/components/forms/InformeCampoForm";

export default async function NuevoInformeCampoPage() {
  await requireSection("informes-campo");

  const fechaHoy = new Date().toISOString().slice(0, 10);

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
        Nuevo informe de campo
      </h1>
      <InformeCampoForm fechaHoy={fechaHoy} colaboradoresCampo={colaboradoresCampo} />
    </div>
  );
}
