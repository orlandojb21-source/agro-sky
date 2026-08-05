import { requireWrite } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { MovimientoForm } from "@/components/forms/MovimientoForm";

export default async function NuevoMovimientoPage() {
  await requireWrite("caja-menuda");

  const supabase = await createClient();
  const [{ data }, { data: proveedoresData }] = await Promise.all([
    supabase.from("colaboradores").select("nombre").order("nombre"),
    supabase.from("proveedores").select("id, nombre").order("nombre"),
  ]);
  const colaboradores = (data ?? []).map((c) => c.nombre as string);
  const proveedores = (proveedoresData ?? []).map((p) => ({ id: p.id as string, nombre: p.nombre as string }));

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-green-900 dark:text-green-50">
        Registrar movimiento
      </h1>
      <MovimientoForm
        fechaHoy={new Date().toISOString().slice(0, 10)}
        colaboradores={colaboradores}
        proveedores={proveedores}
      />
    </div>
  );
}
