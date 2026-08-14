import { notFound } from "next/navigation";
import { requireSection } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { LinkButton } from "@/components/ui/Button";
import { HistorialProyectosTabla, type HistorialProyectoFila } from "@/components/forms/HistorialProyectosTabla";

export default async function HistorialClientePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await requireSection("ventas");

  const supabase = await createClient();
  const [{ data: cliente }, { data: proyectosData }] = await Promise.all([
    supabase.from("clientes").select("id, nombre").eq("id", id).maybeSingle(),
    supabase
      .from("proyectos")
      .select("id, codigo, nombre, tipo_proyecto, estado, creado_en")
      .eq("cliente_id", id)
      .order("creado_en", { ascending: false }),
  ]);

  if (!cliente) notFound();

  const proyectos: HistorialProyectoFila[] = (proyectosData ?? []).map((p) => ({
    id: p.id as string,
    codigo: p.codigo as string,
    nombre: p.nombre as string,
    tipoProyecto: p.tipo_proyecto as "ingenio_santa_rosa" | "particular",
    estado: p.estado as "abierto" | "cerrado",
    creadoEn: p.creado_en as string,
  }));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-green-900 dark:text-green-50">
          Historial de Proyectos — {cliente.nombre as string}
        </h1>
        <LinkButton href="/ventas/clientes" variant="secondary">
          Volver
        </LinkButton>
      </div>

      <HistorialProyectosTabla proyectos={proyectos} />
    </div>
  );
}
