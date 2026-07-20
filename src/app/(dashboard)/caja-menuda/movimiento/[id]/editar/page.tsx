import { notFound } from "next/navigation";
import { requireSection } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { MovimientoForm } from "@/components/forms/MovimientoForm";

export default async function EditarMovimientoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await requireSection("caja-menuda");

  const supabase = await createClient();
  const { data: gasto } = await supabase
    .from("caja_gastos")
    .select("id, fecha, nombre, concepto, monto, colaborador, previsto, entregado, vuelto, nota")
    .eq("id", id)
    .maybeSingle();

  if (!gasto) notFound();

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-green-900 dark:text-green-50">
        Editar movimiento
      </h1>
      <MovimientoForm
        fechaHoy={gasto.fecha}
        valoresIniciales={{
          id: gasto.id,
          fecha: gasto.fecha,
          nombre: gasto.nombre,
          concepto: gasto.concepto,
          monto: gasto.monto === null ? null : Number(gasto.monto),
          colaborador: gasto.colaborador,
          previsto: gasto.previsto === null ? null : Number(gasto.previsto),
          entregado: gasto.entregado === null ? null : Number(gasto.entregado),
          vuelto: gasto.vuelto === null ? null : Number(gasto.vuelto),
          nota: gasto.nota,
        }}
      />
    </div>
  );
}
