import { requireWrite } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { GastoForm } from "@/components/forms/GastoForm";

export default async function NuevoGastoPage() {
  await requireWrite("compras");

  const supabase = await createClient();
  const { data } = await supabase.from("proveedores").select("id, nombre").order("nombre");

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold text-green-900 dark:text-green-50">Nuevo gasto</h1>
      <GastoForm
        proveedores={(data ?? []).map((p) => ({ id: p.id as string, nombre: p.nombre as string }))}
        fechaHoy={new Date().toISOString().slice(0, 10)}
      />
    </div>
  );
}
