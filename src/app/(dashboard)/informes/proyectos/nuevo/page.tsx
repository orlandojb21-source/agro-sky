import { redirect } from "next/navigation";
import { requireWrite } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { ProyectoCatalogoForm } from "@/components/forms/ProyectoCatalogoForm";

export default async function NuevoProyectoPage() {
  const perfil = await requireWrite("informes");
  if (perfil.rol === "campo") redirect("/unauthorized");

  const supabase = await createClient();
  const { data } = await supabase.from("clientes").select("id, nombre").order("nombre");
  const clientes = (data ?? []).map((c) => ({ id: c.id as string, nombre: c.nombre as string }));

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-green-900 dark:text-green-50">
        Nuevo proyecto
      </h1>
      <ProyectoCatalogoForm clientes={clientes} />
    </div>
  );
}
