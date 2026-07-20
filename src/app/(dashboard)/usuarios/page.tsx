import Link from "next/link";
import { requireSection } from "@/lib/session";
import { PageHeader } from "@/components/ui/PageHeader";
import { LinkButton } from "@/components/ui/Button";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { DeleteButton } from "@/components/ui/DeleteButton";
import {
  listarUsuarios,
  eliminarUsuarioAction,
  type UsuarioConEmail,
} from "@/lib/actions/usuarios";
import { ROL_LABEL } from "@/lib/roles";
import { formatDate } from "@/lib/format";

export default async function UsuariosPage() {
  const perfilActual = await requireSection("usuarios");
  const usuarios = await listarUsuarios();

  const columns: Column<UsuarioConEmail>[] = [
    { header: "Nombre", render: (u) => u.nombreCompleto },
    { header: "Correo", render: (u) => u.email },
    { header: "Teléfono", render: (u) => u.telefono ?? "—" },
    { header: "Rol", render: (u) => ROL_LABEL[u.rol] },
    { header: "Desde", render: (u) => formatDate(u.creadoEn) },
    {
      header: "",
      render: (u) => (
        <div className="flex gap-3">
          <Link
            href={`/usuarios/${u.id}/editar`}
            className="text-sm text-green-700 hover:underline dark:text-green-300"
          >
            Editar
          </Link>
          {u.id !== perfilActual.id && (
            <DeleteButton
              action={eliminarUsuarioAction.bind(null, u.id)}
              confirmMessage={`¿Eliminar la cuenta de ${u.nombreCompleto}? Esta acción no se puede deshacer.`}
            />
          )}
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Usuarios"
        description="Solo quienes aparecen aquí pueden entrar a Agro Sky."
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
