import { notFound, redirect } from "next/navigation";
import { requireWrite } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { ProyectoCatalogoForm } from "@/components/forms/ProyectoCatalogoForm";

export default async function EditarProyectoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const perfil = await requireWrite("informes");
  if (perfil.rol === "campo") redirect("/unauthorized");

  const supabase = await createClient();
  const [{ data: proyecto }, { data: clientesData }] = await Promise.all([
    supabase.from("proyectos").select("id, codigo, nombre, cliente_id, tipo_proyecto").eq("id", id).maybeSingle(),
    supabase.from("clientes").select("id, nombre").order("nombre"),
  ]);

  if (!proyecto) notFound();

  const clientes = (clientesData ?? []).map((c) => ({ id: c.id as string, nombre: c.nombre as string }));

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-green-900 dark:text-green-50">
        Editar proyecto
      </h1>
      <ProyectoCatalogoForm
        clientes={clientes}
        valoresIniciales={{
          id: proyecto.id as string,
          codigo: proyecto.codigo as string,
          nombre: proyecto.nombre as string,
          clienteId: proyecto.cliente_id as string,
          tipoProyecto: proyecto.tipo_proyecto as "ingenio_santa_rosa" | "particular",
        }}
      />
    </div>
  );
}
