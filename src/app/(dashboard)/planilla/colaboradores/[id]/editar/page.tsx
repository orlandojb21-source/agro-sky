import { notFound } from "next/navigation";
import { requireSection } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { ColaboradorForm } from "@/components/forms/ColaboradorForm";

export default async function EditarColaboradorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await requireSection("planilla");

  const supabase = await createClient();
  const { data: colaborador } = await supabase
    .from("colaboradores")
    .select("id, nombre, tipo, salario, aplica_deducciones")
    .eq("id", id)
    .maybeSingle();

  if (!colaborador) notFound();

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-green-900 dark:text-green-50">
        Editar colaborador
      </h1>
      <ColaboradorForm
        valoresIniciales={{
          id: colaborador.id as string,
          nombre: colaborador.nombre as string,
          tipo: colaborador.tipo as "fijo" | "campo",
          salario: colaborador.salario === null ? null : Number(colaborador.salario),
          aplicaDeducciones: colaborador.aplica_deducciones as boolean,
        }}
      />
    </div>
  );
}
