import { notFound } from "next/navigation";
import { requireSection } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { tipoDesdeSegmento, etiquetaDeTipo } from "@/lib/inventario-tipo";
import { obtenerRacksConContenedores } from "@/lib/data/racks";
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
  const [{ data: producto }, racks] = await Promise.all([
    supabase
      .from("productos")
      .select(
        "id, numero_parte, descripcion, cantidad, costo, venta, contenedor_id, tipo",
      )
      .eq("id", id)
      .eq("tipo", tipo)
      .maybeSingle(),
    obtenerRacksConContenedores(),
  ]);

  if (!producto) notFound();

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-green-900 dark:text-green-50">
        Editar producto — {etiquetaDeTipo(tipo)}
      </h1>
      <ProductoForm
        tipo={tipo}
        seccionHref={`/inventario/${segmento}`}
        racks={racks}
        valoresIniciales={{
          id: producto.id,
          numeroParte: producto.numero_parte,
          descripcion: producto.descripcion,
          cantidad: producto.cantidad,
          costo: Number(producto.costo),
          venta: Number(producto.venta),
          contenedorId: producto.contenedor_id,
        }}
      />
    </div>
  );
}
