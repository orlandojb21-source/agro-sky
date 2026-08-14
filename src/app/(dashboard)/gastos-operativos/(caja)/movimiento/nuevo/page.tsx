import { requireWrite } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { obtenerCategoriasGasto } from "@/lib/categorias";
import { MovimientoForm } from "@/components/forms/MovimientoForm";

type FilaProyecto = {
  id: string;
  codigo: string;
  nombre: string;
  clientes: { nombre: string } | null;
};

export default async function NuevoMovimientoPage() {
  await requireWrite("gastos-operativos");

  const supabase = await createClient();
  const [{ data }, { data: proveedoresData }, { data: proyectosData }, categorias] = await Promise.all([
    supabase.from("colaboradores").select("nombre").order("nombre"),
    supabase.from("proveedores").select("id, nombre").order("nombre"),
    supabase.from("proyectos").select("id, codigo, nombre, clientes ( nombre )").order("codigo"),
    obtenerCategoriasGasto(supabase, "caja_menuda"),
  ]);
  const colaboradores = (data ?? []).map((c) => c.nombre as string);
  const proveedores = (proveedoresData ?? []).map((p) => ({ id: p.id as string, nombre: p.nombre as string }));
  const proyectos = ((proyectosData ?? []) as unknown as FilaProyecto[]).map((p) => ({
    id: p.id,
    codigo: p.codigo,
    nombre: p.nombre,
    clienteNombre: p.clientes?.nombre ?? "—",
  }));

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-green-900 dark:text-green-50">
        Registrar movimiento
      </h1>
      <MovimientoForm
        fechaHoy={new Date().toISOString().slice(0, 10)}
        colaboradores={colaboradores}
        proveedores={proveedores}
        proyectos={proyectos}
        categorias={categorias}
      />
    </div>
  );
}
