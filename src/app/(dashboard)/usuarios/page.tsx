import { requireSection } from "@/lib/session";
import { PageHeader } from "@/components/ui/PageHeader";
import { LinkButton } from "@/components/ui/Button";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { DeleteButton } from "@/components/ui/DeleteButton";
import { UsuarioRowForm } from "@/components/forms/UsuarioRowForm";
import {
  listarUsuarios,
  eliminarUsuarioAction,
  type UsuarioConEmail,
} from "@/lib/actions/usuarios";
import { formatDate } from "@/lib/format";

export default async function UsuariosPage() {
  const perfilActual = await requireSection("usuarios");
  const usuarios = await listarUsuarios();

  const columns: Column<UsuarioConEmail>[] = [
    { header: "Nombre", render: (u) => u.nombreCompleto },
    { header: "Correo", render: (u) => u.email },
    {
      header: "Rol",
      render: (u) => <UsuarioRowForm id={u.id} rolActual={u.rol} />,
    },
    { header: "Desde", render: (u) => formatDate(u.creadoEn) },
    {
      header: "",
      render: (u) =>
        u.id === perfilActual.id ? null : (
          <DeleteButton
            action={eliminarUsuarioAction.bind(null, u.id)}
            confirmMessage={`¿Eliminar la cuenta de ${u.nombreCompleto}? Esta acción no se puede deshacer.`}
          />
        ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Usuarios"
        description="Solo quienes aparecen aquí pueden entrar a Agro Sky. El rol controla qué secciones ven."
        action={<LinkButton href="/usuarios/nuevo">+ Nuevo usuario</LinkButton>}
      />
      <DataTable
        rows={usuarios}
        columns={columns}
        emptyMessage="Todavía no hay usuarios."
      />
    </div>
  );
}
