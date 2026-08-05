import { requireSection } from "@/lib/session";
import { canWrite } from "@/lib/roles";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/PageHeader";
import { LinkButton } from "@/components/ui/Button";
import { CotizacionesTabla, type CotizacionFila } from "@/components/forms/CotizacionesTabla";

export default async function CotizacionesPage() {
  const perfil = await requireSection("ventas");
  const puedeEscribir = canWrite(perfil.rol, "ventas");

  const supabase = await createClient();
  const { data } = await supabase
    .from("cotizaciones")
    .select("id, fecha, cliente_nombre, total, estado, venta_id")
    .order("fecha", { ascending: false });

  const cotizaciones: CotizacionFila[] = (data ?? []).map((c) => ({
    id: c.id as string,
    fecha: c.fecha as string,
    clienteNombre: c.cliente_nombre as string,
    total: Number(c.total),
    estado: c.estado as "pendiente" | "confirmada",
    ventaId: c.venta_id as string | null,
  }));

  return (
    <div>
      <PageHeader
        title="Cotizaciones"
        action={
          puedeEscribir ? (
            <LinkButton href="/ventas/cotizaciones/nueva">+ Nueva cotización</LinkButton>
          ) : undefined
        }
      />
      <CotizacionesTabla cotizaciones={cotizaciones} puedeEscribir={puedeEscribir} />
    </div>
  );
}
