import { requireSection } from "@/lib/session";
import { PageHeader } from "@/components/ui/PageHeader";
import { LinkButton } from "@/components/ui/Button";
import { listarUsuarios } from "@/lib/actions/usuarios";
import { canWrite } from "@/lib/roles";
import { UsuariosTabla } from "@/components/forms/UsuariosTabla";

export default async function UsuariosPage() {
  const perfilActual = await requireSection("usuarios");
  const puedeEscribir = canWrite(perfilActual.rol, "usuarios");
  const usuarios = await listarUsuarios();

  return (
    <div>
      <PageHeader
        title="Usuarios"
        description="Solo quienes aparecen aquí pueden entrar a Agro Sky."
        action={puedeEscribir ? <LinkButton href="/usuarios/nuevo">+ Nuevo usuario</LinkButton> : undefined}
      />
      <UsuariosTabla usuarios={usuarios} puedeEscribir={puedeEscribir} perfilActualId={perfilActual.id} />
    </div>
  );
}
