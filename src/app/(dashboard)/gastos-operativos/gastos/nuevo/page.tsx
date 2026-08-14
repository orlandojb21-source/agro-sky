import { requireWrite } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { obtenerCategoriasGasto } from "@/lib/categorias";
import { GastoForm } from "@/components/forms/GastoForm";

type FilaProyecto = {
  id: string;
  codigo: string;
  nombre: string;
  clientes: { nombre: string } | null;
};

export default async function NuevoGastoPage() {
  await requireWrite("gastos-operativos");

  const supabase = await createClient();
  const [{ data }, { data: proyectosData }, categorias] = await Promise.all([
    supabase.from("proveedores").select("id, nombre").order("nombre"),
    supabase.from("proyectos").select("id, codigo, nombre, clientes ( nombre )").order("codigo"),
    obtenerCategoriasGasto(supabase, "compras"),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold text-green-900 dark:text-green-50">Nuevo gasto</h1>
      <GastoForm
        proveedores={(data ?? []).map((p) => ({ id: p.id as string, nombre: p.nombre as string }))}
        proyectos={((proyectosData ?? []) as unknown as FilaProyecto[]).map((p) => ({
          id: p.id,
          codigo: p.codigo,
          nombre: p.nombre,
          clienteNombre: p.clientes?.nombre ?? "—",
        }))}
        categorias={categorias}
        fechaHoy={new Date().toISOString().slice(0, 10)}
      />
    </div>
  );
}
