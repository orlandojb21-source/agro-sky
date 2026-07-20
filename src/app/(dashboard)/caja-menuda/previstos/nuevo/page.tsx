import { redirect } from "next/navigation";
import { requireSection } from "@/lib/session";
import { esSoporteOJefe } from "@/lib/roles";
import { PrevistoForm } from "@/components/forms/PrevistoForm";

export default async function NuevoPrevistoPage() {
  const perfil = await requireSection("caja-menuda");
  if (!esSoporteOJefe(perfil.rol)) redirect("/unauthorized");

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-green-900 dark:text-green-50">
        Asignar previsto
      </h1>
      <PrevistoForm fechaHoy={new Date().toISOString().slice(0, 10)} />
    </div>
  );
}
