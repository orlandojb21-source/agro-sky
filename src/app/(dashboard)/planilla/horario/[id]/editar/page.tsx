import { notFound } from "next/navigation";
import { requireSection } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { ControlHorarioForm } from "@/components/forms/ControlHorarioForm";

export default async function EditarControlHorarioPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await requireSection("planilla");

  const supabase = await createClient();
  const [{ data: registro }, { data: colaboradoresData }] = await Promise.all([
    supabase.from("control_horario").select("id, colaborador, fecha, cumplio, nota").eq("id", id).maybeSingle(),
    supabase.from("colaboradores").select("nombre").eq("tipo", "fijo").order("nombre"),
  ]);

  if (!registro) notFound();

  const colaboradores = (colaboradoresData ?? []).map((c) => ({ nombre: c.nombre as string }));

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold text-green-900 dark:text-green-50">Editar registro de horario</h1>
      <ControlHorarioForm
        fechaHoy={registro.fecha as string}
        colaboradores={colaboradores}
        valoresIniciales={{
          id: registro.id as string,
          colaborador: registro.colaborador as string,
          fecha: registro.fecha as string,
          cumplio: registro.cumplio as boolean,
          nota: registro.nota as string | null,
        }}
      />
    </div>
  );
}
