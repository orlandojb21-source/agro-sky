import { notFound, redirect } from "next/navigation";
import { requireSection } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { esSoporteOJefe } from "@/lib/roles";
import { PagoPlanillaForm } from "@/components/forms/PagoPlanillaForm";

export default async function EditarPagoPlanillaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const perfil = await requireSection("planilla");
  if (!esSoporteOJefe(perfil.rol)) {
    redirect("/unauthorized");
  }

  const supabase = await createClient();
  const [{ data: pago }, { data: colaboradoresData }] = await Promise.all([
    supabase
      .from("planilla_pagos")
      .select(
        "id, colaborador, fecha, fecha_desde, descripcion, monto, tipo_trabajo, jornada, css, seguro_educativo, bonificacion",
      )
      .eq("id", id)
      .maybeSingle(),
    supabase.from("colaboradores").select("nombre, tipo, salario, aplica_deducciones").order("nombre"),
  ]);

  if (!pago) notFound();

  const colaboradores = (colaboradoresData ?? []).map((c) => ({
    nombre: c.nombre as string,
    tipo: c.tipo as "fijo" | "campo",
    salario: c.salario === null ? null : Number(c.salario),
    aplicaDeducciones: c.aplica_deducciones as boolean,
  }));

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
        }}
      />
    </div>
  );
}
