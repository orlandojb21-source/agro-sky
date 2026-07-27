import { requireSection } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { MovimientoForm } from "@/components/forms/MovimientoForm";

export default async function NuevoMovimientoPage() {
  await requireSection("caja-menuda");

  const supabase = await createClient();
  const { data } = await supabase.from("colaboradores").select("nombre").order("nombre");
  const colaboradores = (data ?? []).map((c) => c.nombre as string);

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-green-900 dark:text-green-50">
        Registrar movimiento
      </h1>
      <MovimientoForm fechaHoy={new Date().toISOString().slice(0, 10)} colaboradores={colaboradores} />
    </div>
  );
}
