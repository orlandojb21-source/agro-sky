import { requirePerfil } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/PageHeader";
import { PerfilForm } from "@/components/forms/PerfilForm";
import { CambiarPasswordForm } from "@/components/forms/CambiarPasswordForm";
import { BiometricoToggle } from "@/components/forms/BiometricoToggle";

export default async function MiPerfilPage() {
  const perfil = await requirePerfil();

  const supabase = await createClient();
  const { data } = await supabase
    .from("perfiles")
    .select("telefono")
    .eq("id", perfil.id)
    .maybeSingle();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Mi perfil" description={perfil.email} />
      <PerfilForm
        nombreCompleto={perfil.nombreCompleto}
        telefono={data?.telefono ?? null}
      />
      <CambiarPasswordForm />
      <BiometricoToggle
        userId={perfil.id}
        email={perfil.email}
        nombreCompleto={perfil.nombreCompleto}
      />
    </div>
  );
}
