import { notFound } from "next/navigation";
import { requireWrite } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { ProveedorForm } from "@/components/forms/ProveedorForm";

export default async function EditarProveedorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await requireWrite("compras");

  const supabase = await createClient();
  const { data: proveedor } = await supabase
    .from("proveedores")
    .select("id, nombre, contacto, telefono, correo, direccion, ruc, dv, nota")
    .eq("id", id)
    .maybeSingle();

  if (!proveedor) notFound();

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold text-green-900 dark:text-green-50">Editar proveedor</h1>
      <ProveedorForm
        valoresIniciales={{
          id: proveedor.id as string,
          nombre: proveedor.nombre as string,
          contacto: proveedor.contacto as string | null,
          telefono: proveedor.telefono as string | null,
          correo: proveedor.correo as string | null,
          direccion: proveedor.direccion as string | null,
          ruc: proveedor.ruc as string | null,
          dv: proveedor.dv as string | null,
          nota: proveedor.nota as string | null,
        }}
      />
    </div>
  );
}
