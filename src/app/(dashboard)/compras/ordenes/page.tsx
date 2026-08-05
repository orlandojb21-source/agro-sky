import { requireSection } from "@/lib/session";
import { canWrite } from "@/lib/roles";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/PageHeader";
import { OrdenesCompraTabla, type OrdenFila } from "@/components/forms/OrdenesCompraTabla";

export default async function OrdenesCompraPage() {
  const perfil = await requireSection("compras");
  const puedeEscribir = canWrite(perfil.rol, "compras");

  const supabase = await createClient();
  const [{ data: ordenes }, { data: items }] = await Promise.all([
    supabase
      .from("ordenes_compra")
      .select("id, numero_orden, fecha, proveedor_nombre, estado")
      .order("fecha", { ascending: false }),
    supabase.from("orden_compra_items").select("orden_id"),
  ]);

  const conteoPorOrden = new Map<string, number>();
  for (const it of items ?? []) {
    const clave = it.orden_id as string;
    conteoPorOrden.set(clave, (conteoPorOrden.get(clave) ?? 0) + 1);
  }

  const filas: OrdenFila[] = (ordenes ?? []).map((o) => ({
    id: o.id as string,
    numeroOrden: o.numero_orden as number,
    fecha: o.fecha as string,
    proveedorNombre: o.proveedor_nombre as string,
    cantidadItems: conteoPorOrden.get(o.id as string) ?? 0,
    estado: o.estado as "pendiente_recepcion" | "recibida",
  }));

  return (
    <div>
      <PageHeader title="Órdenes de Compra" />
      <OrdenesCompraTabla ordenes={filas} puedeEscribir={puedeEscribir} />
    </div>
  );
}
