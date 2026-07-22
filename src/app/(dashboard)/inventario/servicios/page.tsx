import { requireSection } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/PageHeader";
import { LinkButton } from "@/components/ui/Button";
import { ServicioTabla, type ServicioFila } from "@/components/forms/ServicioTabla";

export default async function ServiciosPage() {
  await requireSection("inventario");

  const supabase = await createClient();
  const { data } = await supabase
    .from("servicios")
    .select("id, nombre, descripcion, costo, precio")
    .order("nombre");

  const servicios: ServicioFila[] = (data ?? []).map((s) => ({
    id: s.id as string,
    nombre: s.nombre as string,
    descripcion: s.descripcion as string | null,
    costo: s.costo === null ? null : Number(s.costo),
    precio: s.precio === null ? null : Number(s.precio),
  }));

  return (
    <div>
      <PageHeader
        title="Inventario — Servicios"
        action={<LinkButton href="/inventario/servicios/nuevo">+ Nuevo servicio</LinkButton>}
      />
      <ServicioTabla servicios={servicios} />
    </div>
  );
}
