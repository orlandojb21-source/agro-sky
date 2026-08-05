import { notFound } from "next/navigation";
import { requireWrite } from "@/lib/session";
import { obtenerUsuario } from "@/lib/actions/usuarios";
import { UsuarioEditForm } from "@/components/forms/UsuarioEditForm";
import { AsignarPasswordForm } from "@/components/forms/AsignarPasswordForm";

export default async function EditarUsuarioPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await requireWrite("usuarios");

  const usuario = await obtenerUsuario(id);
  if (!usuario) notFound();

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold text-green-900 dark:text-green-50">
        Editar usuario
      </h1>
      <UsuarioEditForm
        id={usuario.id}
        nombreCompleto={usuario.nombreCompleto}
        email={usuario.email}
        rol={usuario.rol}
        telefono={usuario.telefono}
      />
      <AsignarPasswordForm id={usuario.id} />
    </div>
  );
}
