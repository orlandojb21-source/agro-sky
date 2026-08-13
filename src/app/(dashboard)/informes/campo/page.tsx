import { requirePerfil } from "@/lib/session";
import { canWrite } from "@/lib/roles";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/PageHeader";
import { LinkButton } from "@/components/ui/Button";
import { InformesCampoTabla, type InformeCampoFila } from "@/components/forms/InformesCampoTabla";

export default async function InformesCampoPage() {
  const perfil = await requirePerfil();
  // Campo puede crear un Informe de Campo pero no editarlo ni eliminarlo
  // (pedido explícito del usuario, 2026-08-04) -- por eso "puedeCrear" y
  // "puedeEditar" son dos flags distintos aquí, a diferencia del resto de
  // la app donde un solo "puedeEscribir" cubre las 3 acciones.
  const puedeCrear = canWrite(perfil.rol, "informes");
  const puedeEditar = puedeCrear && perfil.rol !== "campo";

  const supabase = await createClient();
  const { data } = await supabase
    .from("informes_campo")
    .select("id, cliente, fecha, finca, operador, estado, informe_campo_parcelas ( hectareas )")
    .order("fecha", { ascending: false });

  const informes: InformeCampoFila[] = (data ?? []).map((row) => ({
    id: row.id as string,
    cliente: row.cliente as string,
    fecha: row.fecha as string,
    finca: row.finca as string,
    operador: row.operador as string,
    // Suma TODAS las parcelas del informe (día 1 + cualquier día extra
    // de un Particular "abierto", ver migración 0085) -- todas comparten
    // el mismo informe_id sin importar de qué día son, así que este
    // embed ya trae el total correcto sin cambios.
    hectareas: ((row.informe_campo_parcelas ?? []) as { hectareas: number }[]).reduce(
      (s, p) => s + Number(p.hectareas),
      0,
    ),
    estado: row.estado as "abierto" | "cerrado",
  }));

  return (
    <div>
      <PageHeader
        title="Informes de Campo"
        description="Informe diario de vuelo que se envía al cliente."
        action={puedeCrear ? <LinkButton href="/informes/campo/nuevo">+ Nuevo informe</LinkButton> : undefined}
      />
      <InformesCampoTabla informes={informes} puedeEditar={puedeEditar} />
    </div>
  );
}
