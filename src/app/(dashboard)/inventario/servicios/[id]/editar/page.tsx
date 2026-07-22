import { notFound } from "next/navigation";
import { requireSection } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { ServicioForm } from "@/components/forms/ServicioForm";

export default async function EditarServicioPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await requireSection("inventario");

  const supabase = await createClient();
  const { data: servicio } = await supabase
    .from("servicios")
    .select("id, nombre, descripcion, costo, precio")
    .eq("id", id)
    .maybeSingle();

  if (!servicio) notFound();

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-green-900 dark:text-green-50">
        Editar servicio
      </h1>
      <ServicioForm
        valoresIniciales={{
          id: servicio.id,
          nombre: servicio.nombre,
          descripcion: servicio.descripcion,
          costo: servicio.costo === null ? null : Number(servicio.costo),
          precio: servicio.precio === null ? null : Number(servicio.precio),
        }}
      />
    </div>
  );
}
