import { notFound } from "next/navigation";
import { requireWrite } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { ClienteForm } from "@/components/forms/ClienteForm";

export default async function EditarClientePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await requireWrite("ventas");

  const supabase = await createClient();
  const { data: cliente } = await supabase
    .from("clientes")
    .select("id, nombre, cedula, ruc, ruc_dv, telefono, direccion, correo")
    .eq("id", id)
    .maybeSingle();

  if (!cliente) notFound();

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-green-900 dark:text-green-50">
        Editar cliente
      </h1>
      <ClienteForm
        valoresIniciales={{
          id: cliente.id as string,
          nombre: cliente.nombre as string,
          cedula: cliente.cedula as string | null,
          ruc: cliente.ruc as string | null,
          rucDv: cliente.ruc_dv as string | null,
          telefono: cliente.telefono as string | null,
          direccion: cliente.direccion as string | null,
          correo: cliente.correo as string | null,
        }}
      />
    </div>
  );
}
