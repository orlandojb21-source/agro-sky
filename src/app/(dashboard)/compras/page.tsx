import { requireSection } from "@/lib/session";
import { canWrite } from "@/lib/roles";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/PageHeader";
import { LinkButton } from "@/components/ui/Button";
import { SolicitudesCompraTabla, type SolicitudFila } from "@/components/forms/SolicitudesCompraTabla";

export default async function ComprasPage() {
  const perfil = await requireSection("compras");
  const puedeEscribir = canWrite(perfil.rol, "compras");

  const supabase = await createClient();
  const [{ data: solicitudes }, { data: items }] = await Promise.all([
    supabase
      .from("solicitudes_compra")
      .select("id, numero_solicitud, fecha, estado")
      .order("fecha", { ascending: false }),
    supabase.from("solicitud_compra_items").select("solicitud_id"),
  ]);

  const conteoPorSolicitud = new Map<string, number>();
  for (const it of items ?? []) {
    const clave = it.solicitud_id as string;
    conteoPorSolicitud.set(clave, (conteoPorSolicitud.get(clave) ?? 0) + 1);
  }

  const filas: SolicitudFila[] = (solicitudes ?? []).map((s) => ({
    id: s.id as string,
    numeroSolicitud: s.numero_solicitud as number,
    fecha: s.fecha as string,
    cantidadItems: conteoPorSolicitud.get(s.id as string) ?? 0,
    estado: s.estado as "pendiente" | "aprobada" | "rechazada",
  }));

  return (
    <div>
      <PageHeader
        title="Solicitudes de Compra"
        action={
          puedeEscribir ? <LinkButton href="/compras/nueva">+ Nueva solicitud</LinkButton> : undefined
        }
      />
      <SolicitudesCompraTabla solicitudes={filas} puedeEscribir={puedeEscribir} />
    </div>
  );
}
