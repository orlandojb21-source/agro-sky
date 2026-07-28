import { requireSection } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { PagoPlanillaForm } from "@/components/forms/PagoPlanillaForm";

export default async function NuevoPagoPlanillaPage() {
  await requireSection("planilla");

  const supabase = await createClient();
  const { data } = await supabase
    .from("colaboradores")
    .select("nombre, tipo, salario, aplica_deducciones")
    .order("nombre");
  const colaboradores = (data ?? []).map((c) => ({
    nombre: c.nombre as string,
    tipo: c.tipo as "fijo" | "campo",
    salario: c.salario === null ? null : Number(c.salario),
    aplicaDeducciones: c.aplica_deducciones as boolean,
  }));

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-green-900 dark:text-green-50">
        Nuevo registro de planilla
      </h1>
      <PagoPlanillaForm fechaHoy={new Date().toISOString().slice(0, 10)} colaboradores={colaboradores} />
    </div>
  );
}
