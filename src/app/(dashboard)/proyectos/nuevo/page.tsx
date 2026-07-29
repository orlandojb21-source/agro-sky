import { requireSection } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import {
  ProyectoInformeForm,
  type PagoPlanillaProyecto,
  type GastoViaticoCajaMenuda,
} from "@/components/forms/ProyectoInformeForm";

export default async function NuevoInformeProyectoPage() {
  await requireSection("proyectos");

  const hoy = new Date();
  const fechaHoy = hoy.toISOString().slice(0, 10);
  const hasta = new Date(hoy);
  hasta.setDate(hasta.getDate() + 6);
  const fechaHastaSugerida = hasta.toISOString().slice(0, 10);

  const supabase = await createClient();
  const [{ data: pagosData }, { data: viaticosData }] = await Promise.all([
    supabase.from("planilla_pagos").select("descripcion, fecha, monto").eq("tipo_trabajo", "proyecto"),
    supabase.from("caja_gastos").select("concepto, fecha, monto").eq("categoria", "Viáticos"),
  ]);

  const pagosPlanillaProyecto: PagoPlanillaProyecto[] = (pagosData ?? []).map((p) => ({
    descripcion: p.descripcion as string,
    fecha: p.fecha as string,
    monto: Number(p.monto),
  }));

  const gastosViaticosCajaMenuda: GastoViaticoCajaMenuda[] = (viaticosData ?? [])
    .filter((g) => g.concepto)
    .map((g) => ({
      concepto: g.concepto as string,
      fecha: g.fecha as string,
      monto: Number(g.monto),
    }));

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-green-900 dark:text-green-50">
        Nuevo informe de proyecto
      </h1>
      <ProyectoInformeForm
        fechaHoy={fechaHoy}
        fechaHastaSugerida={fechaHastaSugerida}
        pagosPlanillaProyecto={pagosPlanillaProyecto}
        gastosViaticosCajaMenuda={gastosViaticosCajaMenuda}
      />
    </div>
  );
}
