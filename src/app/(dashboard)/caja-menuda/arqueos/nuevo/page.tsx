import { redirect } from "next/navigation";
import { requireSection } from "@/lib/session";
import { esSoporteOJefe } from "@/lib/roles";
import { createClient } from "@/lib/supabase/server";
import { calcularSaldoActual } from "@/lib/caja";
import { ArqueoForm } from "@/components/forms/ArqueoForm";

export default async function NuevoArqueoPage() {
  const perfil = await requireSection("caja-menuda");
  if (!esSoporteOJefe(perfil.rol)) redirect("/unauthorized");

  const supabase = await createClient();
  const saldoEsperado = await calcularSaldoActual(supabase);

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-green-900 dark:text-green-50">
        Nuevo arqueo de caja
      </h1>
      <ArqueoForm fechaHoy={new Date().toISOString().slice(0, 10)} saldoEsperado={saldoEsperado} />
    </div>
  );
}
