import { redirect } from "next/navigation";
import { requirePerfil } from "@/lib/session";
import { esAuditor } from "@/lib/auditoria";
import { createClient } from "@/lib/supabase/server";
import { NAV } from "@/components/layout/nav-items";
import { PageHeader } from "@/components/ui/PageHeader";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { formatDateTime } from "@/lib/format";

const LIMITE = 500;

function etiquetaSeccion(seccion: string): string {
  return NAV.find((item) => item.seccion === seccion)?.label ?? seccion;
}

type FilaAuditoria = {
  id: string;
  usuarioNombre: string;
  correo: string;
  seccion: string;
  creadoEn: string;
};

export default async function AuditoriaPage() {
  const perfil = await requirePerfil();
  if (!esAuditor(perfil.email)) {
    redirect("/unauthorized");
  }

  const supabase = await createClient();
  const { data } = await supabase
    .from("auditoria_acciones")
    .select("id, usuario_nombre, correo, seccion, creado_en")
    .order("creado_en", { ascending: false })
    .limit(LIMITE);

  const filas: FilaAuditoria[] = (data ?? []).map((r) => ({
    id: r.id as string,
    usuarioNombre: r.usuario_nombre as string,
    correo: r.correo as string,
    seccion: r.seccion as string,
    creadoEn: r.creado_en as string,
  }));

  const columnas: Column<FilaAuditoria>[] = [
    { header: "Usuario", render: (f) => f.usuarioNombre },
    { header: "Correo", render: (f) => f.correo },
    { header: "Sección", render: (f) => etiquetaSeccion(f.seccion) },
    { header: "Fecha y hora", render: (f) => formatDateTime(f.creadoEn) },
  ];

  return (
    <div>
      <PageHeader
        title="Auditoría"
        description={`Registro de actividad de escritura por usuario, más reciente primero (últimas ${LIMITE}). Visible solo para esta cuenta.`}
      />
      <DataTable columns={columnas} rows={filas} emptyMessage="Todavía no hay actividad registrada." />
    </div>
  );
}
