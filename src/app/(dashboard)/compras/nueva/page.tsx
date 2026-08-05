import { requireWrite } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { SolicitudCompraForm, type CatalogoProductoCompra } from "@/components/forms/SolicitudCompraForm";

export default async function NuevaSolicitudCompraPage() {
  await requireWrite("compras");

  const supabase = await createClient();
  const { data: productos } = await supabase
    .from("productos")
    .select("id, tipo, numero_parte, descripcion, cantidad")
    .order("numero_parte");

  const aCatalogo = (p: {
    id: string;
    numero_parte: string;
    descripcion: string;
    cantidad: number;
  }): CatalogoProductoCompra => ({
    id: p.id,
    numeroParte: p.numero_parte,
    descripcion: p.descripcion,
    cantidad: p.cantidad,
  });

  const productosNuevos: CatalogoProductoCompra[] = (productos ?? [])
    .filter((p) => p.tipo === "nuevo")
    .map(aCatalogo);
  const productosUsados: CatalogoProductoCompra[] = (productos ?? [])
    .filter((p) => p.tipo === "usado")
    .map(aCatalogo);

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-green-900 dark:text-green-50">
        Nueva solicitud de compra
      </h1>
      <SolicitudCompraForm
        fechaHoy={new Date().toISOString().slice(0, 10)}
        productosNuevos={productosNuevos}
        productosUsados={productosUsados}
      />
    </div>
  );
}
