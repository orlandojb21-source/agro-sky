import { notFound } from "next/navigation";
import { requireWrite } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { esSoporteOJefe } from "@/lib/roles";
import { PagoPlanillaForm } from "@/components/forms/PagoPlanillaForm";
import type { DetalleTalonarioCampo } from "@/lib/exportar";

export default async function EditarPagoPlanillaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const perfil = await requireWrite("planilla");

  const supabase = await createClient();
  const [{ data: pago }, { data: colaboradoresData }] = await Promise.all([
    supabase
      .from("planilla_pagos")
      .select(
        "id, colaborador, fecha, fecha_desde, descripcion, monto, tipo_trabajo, jornada, css, seguro_educativo, bonificacion, decimo_tercer_mes, prestamo_id, monto_prestamo, detalle_calculo",
      )
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("colaboradores")
      .select("nombre, tipo, salario, bonificacion, aplica_deducciones, aplica_decimo_tercer_mes")
      .order("nombre"),
  ]);

  // Si el administrador entra directo a la URL de un pago Fijo, RLS
  // (migración 0049) ya no le devuelve la fila -- llega null aquí igual
  // que si el pago no existiera.
  if (!pago) notFound();

  let colaboradores = (colaboradoresData ?? []).map((c) => ({
    nombre: c.nombre as string,
    tipo: c.tipo as "fijo" | "campo",
    salario: c.salario === null ? null : Number(c.salario),
    bonificacion: c.bonificacion === null ? null : Number(c.bonificacion),
    aplicaDeducciones: c.aplica_deducciones as boolean,
    aplicaDecimoTercerMes: c.aplica_decimo_tercer_mes as boolean,
  }));

  if (!esSoporteOJefe(perfil.rol)) {
    colaboradores = colaboradores.filter((c) => c.tipo !== "fijo");
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-green-900 dark:text-green-50">
        Editar pago de planilla
      </h1>
      <PagoPlanillaForm
        fechaHoy={pago.fecha}
        colaboradores={colaboradores}
        valoresIniciales={{
          id: pago.id,
          colaborador: pago.colaborador,
          fecha: pago.fecha,
          fechaDesde: pago.fecha_desde as string | null,
          descripcion: pago.descripcion,
          monto: Number(pago.monto),
          tipoTrabajo: pago.tipo_trabajo as "proyecto" | "oficina" | null,
          jornada: pago.jornada as "completo" | "medio" | "proyecto" | null,
          css: pago.css === null ? null : Number(pago.css),
          seguroEducativo: pago.seguro_educativo === null ? null : Number(pago.seguro_educativo),
          bonificacion: pago.bonificacion === null ? null : Number(pago.bonificacion),
          decimoTercerMes: pago.decimo_tercer_mes === null ? null : Number(pago.decimo_tercer_mes),
          prestamoId: pago.prestamo_id as string | null,
          montoPrestamo: pago.monto_prestamo === null ? null : Number(pago.monto_prestamo),
          detalleCalculo: pago.detalle_calculo as DetalleTalonarioCampo[] | null,
        }}
      />
    </div>
  );
}
