import { requireSection } from "@/lib/session";
import { canWrite } from "@/lib/roles";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/PageHeader";
import { ProveedorForm } from "@/components/forms/ProveedorForm";
import { ProveedorFormToggle } from "@/components/forms/ProveedorFormToggle";
import { ProveedoresTabla, type ProveedorFila } from "@/components/forms/ProveedoresTabla";

export default async function ProveedoresPage() {
  const perfil = await requireSection("compras");
  const puedeEscribir = canWrite(perfil.rol, "compras");

  const supabase = await createClient();
  const { data } = await supabase
    .from("proveedores")
    .select("id, nombre, contacto, telefono, correo")
    .order("nombre");

  const proveedores: ProveedorFila[] = (data ?? []).map((p) => ({
    id: p.id as string,
    nombre: p.nombre as string,
    contacto: p.contacto as string | null,
    telefono: p.telefono as string | null,
    correo: p.correo as string | null,
  }));

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Proveedores" description="Datos de los proveedores de la empresa." />
      {puedeEscribir && (
        <ProveedorFormToggle>
          <ProveedorForm />
        </ProveedorFormToggle>
      )}
      <ProveedoresTabla proveedores={proveedores} puedeEscribir={puedeEscribir} />
    </div>
  );
}
