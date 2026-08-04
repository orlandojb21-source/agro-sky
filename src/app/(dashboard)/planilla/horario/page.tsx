import Link from "next/link";
import { requireSection } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/PageHeader";
import { LinkButton } from "@/components/ui/Button";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { DeleteButton } from "@/components/ui/DeleteButton";
import { eliminarControlHorarioAction } from "@/lib/actions/controlHorario";
import { formatDateOnly } from "@/lib/format";

type ControlHorarioFila = {
  id: string;
  colaborador: string;
  fecha: string;
  cumplio: boolean;
  nota: string | null;
};

export default async function ControlHorarioPage() {
  await requireSection("planilla");

  const supabase = await createClient();
  const { data } = await supabase
    .from("control_horario")
    .select("id, colaborador, fecha, cumplio, nota")
    .order("fecha", { ascending: false });

  const registros: ControlHorarioFila[] = (data ?? []).map((r) => ({
    id: r.id as string,
    colaborador: r.colaborador as string,
    fecha: r.fecha as string,
    cumplio: r.cumplio as boolean,
    nota: r.nota as string | null,
  }));

  const columns: Column<ControlHorarioFila>[] = [
    { header: "Fecha", render: (r) => formatDateOnly(r.fecha) },
    { header: "Colaborador", render: (r) => r.colaborador },
    {
      header: "Asistencia",
      render: (r) =>
        r.cumplio ? (
          <span className="rounded-full bg-green-100 px-2.5 py-1 text-xs font-medium text-green-700 dark:bg-green-500/10 dark:text-green-400">
            Sí
          </span>
        ) : (
          <span className="rounded-full bg-red-100 px-2.5 py-1 text-xs font-medium text-red-700 dark:bg-red-500/10 dark:text-red-400">
            No
          </span>
        ),
    },
    { header: "Nota", render: (r) => r.nota ?? "—" },
    {
      header: "",
      render: (r) => (
        <div className="flex gap-3">
          <Link
            href={`/planilla/horario/${r.id}/editar`}
            className="text-sm text-green-700 hover:underline dark:text-green-300"
          >
            Editar
          </Link>
          <DeleteButton
            action={eliminarControlHorarioAction.bind(null, r.id)}
            confirmMessage="¿Eliminar este registro? Esta acción no se puede deshacer."
          />
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Control de Horario"
        description="Cumplimiento diario del horario de colaboradores Fijos (44h semanales)."
        action={<LinkButton href="/planilla/horario/nuevo">+ Nuevo registro</LinkButton>}
      />
      <DataTable rows={registros} columns={columns} emptyMessage="Todavía no hay registros de horario." />
    </div>
  );
}
