import { notFound } from "next/navigation";
import { requireSection } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { PagoPlanillaForm } from "@/components/forms/PagoPlanillaForm";

export default async function EditarPagoPlanillaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await requireSection("planilla");

  const supabase = await createClient();
  const { data: pago } = await supabase
    .from("planilla_pagos")
    .select("id, colaborador, fecha, descripcion, monto")
    .eq("id", id)
    .maybeSingle();

  if (!pago) notFound();

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-green-900 dark:text-green-50">
        Editar registro de planilla
      </h1>
      <PagoPlanillaForm
        fechaHoy={pago.fecha}
        valoresIniciales={{
          id: pago.id,
          colaborador: pago.colaborador,
          fecha: pago.fecha,
          descripcion: pago.descripcion,
          monto: Number(pago.monto),
        }}
      />
    </div>
  );
}
