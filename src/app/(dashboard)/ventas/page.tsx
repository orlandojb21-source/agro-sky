import { requireSection } from "@/lib/session";
import { canWrite } from "@/lib/roles";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/PageHeader";
import { LinkButton } from "@/components/ui/Button";
import { VentasTabla, type VentaFila } from "@/components/forms/VentasTabla";

export default async function VentasPage() {
  const perfil = await requireSection("ventas");
  const puedeEscribir = canWrite(perfil.rol, "ventas");

  const supabase = await createClient();
  const { data } = await supabase
    .from("ventas")
    .select(
      "id, numero_factura, fecha, cliente_nombre, subtotal_gravado, subtotal_exento, itbms, total, estado_pago, fecha_vencimiento",
    )
    .order("fecha", { ascending: false });

  const ventas: VentaFila[] = (data ?? []).map((v) => ({
    id: v.id as string,
    numeroFactura: v.numero_factura as number,
    fecha: v.fecha as string,
    clienteNombre: v.cliente_nombre as string,
    subtotalGravado: Number(v.subtotal_gravado),
    subtotalExento: Number(v.subtotal_exento),
    itbms: Number(v.itbms),
    total: Number(v.total),
    estadoPago: v.estado_pago as "pagada" | "pendiente",
    fechaVencimiento: v.fecha_vencimiento as string | null,
  }));

  return (
    <div>
      <PageHeader
        title="Ventas"
        action={puedeEscribir ? <LinkButton href="/ventas/nueva">+ Nueva venta</LinkButton> : undefined}
      />
      <VentasTabla ventas={ventas} puedeEscribir={puedeEscribir} />
    </div>
  );
}
