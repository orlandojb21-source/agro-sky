import { notFound } from "next/navigation";
import { requireSection } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { tipoDesdeSegmento, etiquetaDeTipo } from "@/lib/inventario-tipo";
import { ProductoForm } from "@/components/forms/ProductoForm";

export default async function EditarProductoPage({
  params,
}: {
  params: Promise<{ tipo: string; id: string }>;
}) {
  const { tipo: segmento, id } = await params;
  await requireSection("inventario");
  const tipo = tipoDesdeSegmento(segmento);

  const supabase = await createClient();
  const { data: producto } = await supabase
    .from("productos")
    .select("id, numero_parte, descripcion, cantidad, costo, venta, fila, contenedor, unidad, tipo")
    .eq("id", id)
    .eq("tipo", tipo)
    .maybeSingle();

  if (!producto) notFound();

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-green-900 dark:text-green-50">
        Editar producto — {etiquetaDeTipo(tipo)}
      </h1>
      <ProductoForm
        tipo={tipo}
        seccionHref={`/inventario/${segmento}`}
        valoresIniciales={{
          id: producto.id,
          numeroParte: producto.numero_parte,
          descripcion: producto.descripcion,
          cantidad: producto.cantidad,
          costo: Number(producto.costo),
          venta: Number(producto.venta),
          fila: producto.fila,
          contenedor: producto.contenedor,
          unidad: producto.unidad,
        }}
      />
    </div>
  );
}
