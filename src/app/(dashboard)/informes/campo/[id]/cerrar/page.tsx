import { notFound, redirect } from "next/navigation";
import { requireWrite } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { CerrarInformeCampoForm } from "@/components/forms/CerrarInformeCampoForm";

export default async function CerrarInformeCampoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  // Cerrar un informe queda para Administrador/Gerente General/Soporte IT
  // -- mismo candado que editar/eliminar (Campo no cierra).
  const perfil = await requireWrite("informes");
  if (perfil.rol === "campo") redirect("/unauthorized");

  const supabase = await createClient();
  const { data: informe } = await supabase
    .from("informes_campo")
    .select("id, cliente, tipo_proyecto, estado")
    .eq("id", id)
    .maybeSingle();

  if (!informe) notFound();
  if (informe.tipo_proyecto !== "particular" || informe.estado !== "abierto") {
    redirect(`/informes/campo/${id}`);
  }

  return (
    <div>
      <h1 className="mb-1 text-2xl font-semibold text-green-900 dark:text-green-50">Cerrar informe</h1>
      <p className="mb-6 text-sm text-green-700/70 dark:text-green-200/70">{informe.cliente as string}</p>
      <CerrarInformeCampoForm informeId={id} />
    </div>
  );
}
