import { notFound, redirect } from "next/navigation";
import { requireWrite } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { AgregarDiaInformeCampoForm } from "@/components/forms/AgregarDiaInformeCampoForm";

export default async function AgregarDiaInformeCampoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  // Campo SÍ puede agregar un día (mismo criterio que crear el informe) --
  // solo editar/eliminar/cerrar quedan para Administrador/Gerente
  // General/Soporte IT.
  await requireWrite("informes");

  const supabase = await createClient();
  const [{ data: informe }, { data: ultimoDia }, { data: colaboradoresData }] = await Promise.all([
    supabase.from("informes_campo").select("id, cliente, tipo_proyecto, estado, operador").eq("id", id).maybeSingle(),
    supabase
      .from("informe_campo_dias")
      .select("operador")
      .eq("informe_id", id)
      .order("creado_en", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase.from("colaboradores").select("nombre").eq("tipo", "campo").order("nombre"),
  ]);

  if (!informe) notFound();
  // Solo un Particular "abierto" acepta días nuevos -- si alguien llega
  // acá con la URL directa a un informe que ya no califica, se redirige
  // en vez de dejar intentar (el RPC igual lo rechazaría, pero así se
  // evita el paso extra).
  if (informe.tipo_proyecto !== "particular" || informe.estado !== "abierto") {
    redirect(`/informes/campo/${id}`);
  }

  const colaboradoresCampo = (colaboradoresData ?? []).map((c) => c.nombre as string);
  const operadorSugerido = (ultimoDia?.operador as string | undefined) ?? (informe.operador as string);
  const fechaHoy = new Date().toISOString().slice(0, 10);

  return (
    <div>
      <h1 className="mb-1 text-2xl font-semibold text-green-900 dark:text-green-50">Agregar día</h1>
      <p className="mb-6 text-sm text-green-700/70 dark:text-green-200/70">{informe.cliente as string}</p>
      <AgregarDiaInformeCampoForm
        informeId={id}
        fechaHoy={fechaHoy}
        colaboradoresCampo={colaboradoresCampo}
        operadorSugerido={operadorSugerido}
      />
    </div>
  );
}
