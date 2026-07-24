import { requireSection } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/PageHeader";
import { LinkButton } from "@/components/ui/Button";
import { VentasTabla, type VentaFila } from "@/components/forms/VentasTabla";

export default async function VentasPage() {
  await requireSection("ventas");

  const supabase = await createClient();
  const { data } = await supabase
    .from("ventas")
    .select("id, fecha, cliente_nombre, subtotal_gravado, subtotal_exento, itbms, total")
    .order("fecha", { ascending: false });

  const ventas: VentaFila[] = (data ?? []).map((v) => ({
    id: v.id as string,
    fecha: v.fecha as string,
    clienteNombre: v.cliente_nombre as string,
    subtotalGravado: Number(v.subtotal_gravado),
    subtotalExento: Number(v.subtotal_exento),
    itbms: Number(v.itbms),
    total: Number(v.total),
  }));

  return (
    <div>
      <PageHeader
        title="Ventas"
        action={<LinkButton href="/ventas/nueva">+ Nueva venta</LinkButton>}
      />
      <VentasTabla ventas={ventas} />
    </div>
  );
}
