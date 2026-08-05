import Link from "next/link";
import { requireSection } from "@/lib/session";
import { canWrite } from "@/lib/roles";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/PageHeader";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { DeleteButton } from "@/components/ui/DeleteButton";
import { ProveedorForm } from "@/components/forms/ProveedorForm";
import { ProveedorFormToggle } from "@/components/forms/ProveedorFormToggle";
import { eliminarProveedorAction } from "@/lib/actions/proveedores";

type ProveedorFila = {
  id: string;
  nombre: string;
  contacto: string | null;
  telefono: string | null;
  correo: string | null;
};

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

  const columns: Column<ProveedorFila>[] = [
    { header: "Nombre", render: (p) => p.nombre },
    { header: "Contacto", render: (p) => p.contacto ?? "—" },
    { header: "Teléfono", render: (p) => p.telefono ?? "—" },
    { header: "Correo", render: (p) => p.correo ?? "—" },
    ...(puedeEscribir
      ? [
          {
            header: "",
            render: (p: ProveedorFila) => (
              <div className="flex gap-3">
                <Link
                  href={`/compras/proveedores/${p.id}/editar`}
                  className="text-sm text-green-700 hover:underline dark:text-green-300"
                >
                  Editar
                </Link>
                <DeleteButton
                  action={eliminarProveedorAction.bind(null, p.id)}
                  confirmMessage={`¿Eliminar a ${p.nombre}? Los gastos ya registrados con este proveedor no se ven afectados.`}
                />
              </div>
            ),
          },
        ]
      : []),
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Proveedores" description="Datos de los proveedores de la empresa." />
      {puedeEscribir && (
        <ProveedorFormToggle>
          <ProveedorForm />
        </ProveedorFormToggle>
      )}
      <DataTable rows={proveedores} columns={columns} emptyMessage="Todavía no hay proveedores registrados." />
    </div>
  );
}
