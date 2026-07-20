import { redirect } from "next/navigation";
import { requireSection } from "@/lib/session";
import { esSoporteOJefe } from "@/lib/roles";
import { ReposicionForm } from "@/components/forms/ReposicionForm";

export default async function NuevaReposicionPage() {
  const perfil = await requireSection("caja-menuda");
  if (!esSoporteOJefe(perfil.rol)) redirect("/unauthorized");

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-green-900 dark:text-green-50">
        Reponer caja
      </h1>
      <ReposicionForm fechaHoy={new Date().toISOString().slice(0, 10)} />
    </div>
  );
}
