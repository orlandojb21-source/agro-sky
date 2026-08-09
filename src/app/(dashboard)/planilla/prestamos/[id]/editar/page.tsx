import { notFound } from "next/navigation";
import { requireWrite } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { PrestamoForm } from "@/components/forms/PrestamoForm";

export default async function EditarPrestamoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await requireWrite("planilla");

  const supabase = await createClient();
  const [{ data: prestamo }, { data: colaboradoresData }] = await Promise.all([
    supabase
      .from("prestamos")
      .select("id, colaborador, fecha, monto, cuota_quincenal, nota")
      .eq("id", id)
      .maybeSingle(),
    supabase.from("colaboradores").select("nombre").order("nombre"),
  ]);

  if (!prestamo) notFound();

  const colaboradores = (colaboradoresData ?? []).map((c) => c.nombre as string);

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-green-900 dark:text-green-50">Editar préstamo</h1>
      <PrestamoForm
        colaboradores={colaboradores}
        fechaHoy={prestamo.fecha as string}
        valoresIniciales={{
          id: prestamo.id as string,
          colaborador: prestamo.colaborador as string,
          fecha: prestamo.fecha as string,
          monto: Number(prestamo.monto),
          cuotaQuincenal: Number(prestamo.cuota_quincenal),
          nota: prestamo.nota as string | null,
        }}
      />
    </div>
  );
}
