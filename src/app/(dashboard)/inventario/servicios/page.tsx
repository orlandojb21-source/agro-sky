import { requireSection } from "@/lib/session";
import { canWrite } from "@/lib/roles";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/PageHeader";
import { LinkButton } from "@/components/ui/Button";
import { ServicioTabla, type ServicioFila } from "@/components/forms/ServicioTabla";

export default async function ServiciosPage() {
  const perfil = await requireSection("inventario");
  const puedeEscribir = canWrite(perfil.rol, "inventario");

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
        action={
          puedeEscribir ? (
            <LinkButton href="/inventario/servicios/nuevo">+ Nuevo servicio</LinkButton>
          ) : undefined
        }
      />
      <ServicioTabla servicios={servicios} puedeEscribir={puedeEscribir} />
    </div>
  );
}
