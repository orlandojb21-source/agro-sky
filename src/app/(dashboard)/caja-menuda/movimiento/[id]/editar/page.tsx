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
    .select(
      "id, fecha, nombre, concepto, monto_detalle, colaborador, previsto, entregado_detalle, vuelto_detalle, nota",
    )
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
          montoDetalle: gasto.monto_detalle as Record<string, number> | null,
          colaborador: gasto.colaborador,
          previsto: gasto.previsto === null ? null : Number(gasto.previsto),
          entregadoDetalle: gasto.entregado_detalle as Record<string, number> | null,
          vueltoDetalle: gasto.vuelto_detalle as Record<string, number> | null,
          nota: gasto.nota,
        }}
      />
    </div>
  );
}
