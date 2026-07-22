import { notFound } from "next/navigation";
import { requireSection } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { ReposicionForm } from "@/components/forms/ReposicionForm";

export default async function EditarReposicionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await requireSection("caja-menuda");

  const supabase = await createClient();
  const { data: reposicion } = await supabase
    .from("caja_reposiciones")
    .select("id, fecha, monto_detalle, nota")
    .eq("id", id)
    .maybeSingle();

  if (!reposicion) notFound();

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-green-900 dark:text-green-50">
        Editar reposición
      </h1>
      <ReposicionForm
        fechaHoy={reposicion.fecha}
        valoresIniciales={{
          id: reposicion.id,
          fecha: reposicion.fecha,
          montoDetalle: reposicion.monto_detalle as Record<string, number> | null,
          nota: reposicion.nota,
        }}
      />
    </div>
  );
}
