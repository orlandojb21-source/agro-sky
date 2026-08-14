import { requireSection } from "@/lib/session";
import { canWrite } from "@/lib/roles";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/PageHeader";
import { LinkButton } from "@/components/ui/Button";
import { ClienteTabla, type ClienteFila } from "@/components/forms/ClienteTabla";

export default async function ClientesPage() {
  const perfil = await requireSection("informes");
  const puedeEscribir = canWrite(perfil.rol, "informes") && perfil.rol !== "campo";

  const supabase = await createClient();
  const { data } = await supabase
    .from("clientes")
    .select("id, nombre, cedula, ruc, telefono, correo")
    .order("nombre");

  const clientes: ClienteFila[] = (data ?? []).map((c) => ({
    id: c.id as string,
    nombre: c.nombre as string,
    cedula: c.cedula as string | null,
    ruc: c.ruc as string | null,
    telefono: c.telefono as string | null,
    correo: c.correo as string | null,
  }));

  return (
    <div>
      <PageHeader
        title="Clientes"
        action={puedeEscribir ? <LinkButton href="/informes/clientes/nuevo">+ Nuevo cliente</LinkButton> : undefined}
      />
      <ClienteTabla clientes={clientes} puedeEscribir={puedeEscribir} />
    </div>
  );
}
