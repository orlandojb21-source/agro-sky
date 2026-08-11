import { requireWrite } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { obtenerCategoriasGasto } from "@/lib/categorias";
import { GastoForm } from "@/components/forms/GastoForm";

export default async function NuevoGastoPage() {
  await requireWrite("gastos-operativos");

  const supabase = await createClient();
  const [{ data }, categorias] = await Promise.all([
    supabase.from("proveedores").select("id, nombre").order("nombre"),
    obtenerCategoriasGasto(supabase, "compras"),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold text-green-900 dark:text-green-50">Nuevo gasto</h1>
      <GastoForm
        proveedores={(data ?? []).map((p) => ({ id: p.id as string, nombre: p.nombre as string }))}
        categorias={categorias}
        fechaHoy={new Date().toISOString().slice(0, 10)}
      />
    </div>
  );
}
