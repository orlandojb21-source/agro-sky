import { requireWrite } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { esSoporteOJefe } from "@/lib/roles";
import { PagoPlanillaForm } from "@/components/forms/PagoPlanillaForm";

export default async function NuevoPagoPlanillaPage() {
  const perfil = await requireWrite("planilla");

  const supabase = await createClient();
  const { data } = await supabase
    .from("colaboradores")
    .select("nombre, tipo, salario, bonificacion, aplica_deducciones")
    .order("nombre");
  let colaboradores = (data ?? []).map((c) => ({
    nombre: c.nombre as string,
    tipo: c.tipo as "fijo" | "campo",
    salario: c.salario === null ? null : Number(c.salario),
    bonificacion: c.bonificacion === null ? null : Number(c.bonificacion),
    aplicaDeducciones: c.aplica_deducciones as boolean,
  }));

  // El administrador solo gestiona pagos de Campo -- ni siquiera aparecen
  // los Fijos como opción para elegir (reforzado también a nivel de RLS,
  // migración 0049, esto es solo la UI).
  if (!esSoporteOJefe(perfil.rol)) {
    colaboradores = colaboradores.filter((c) => c.tipo !== "fijo");
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-green-900 dark:text-green-50">
        Nuevo pago de planilla
      </h1>
      <PagoPlanillaForm fechaHoy={new Date().toISOString().slice(0, 10)} colaboradores={colaboradores} />
    </div>
  );
}
