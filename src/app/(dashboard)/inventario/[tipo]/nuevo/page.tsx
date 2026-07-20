import { requireSection } from "@/lib/session";
import { tipoDesdeSegmento, etiquetaDeTipo } from "@/lib/inventario-tipo";
import { ProductoForm } from "@/components/forms/ProductoForm";

export default async function NuevoProductoPage({
  params,
}: {
  params: Promise<{ tipo: string }>;
}) {
  const { tipo: segmento } = await params;
  await requireSection("inventario");
  const tipo = tipoDesdeSegmento(segmento);

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-green-900 dark:text-green-50">
        Nuevo producto — {etiquetaDeTipo(tipo)}
      </h1>
      <ProductoForm tipo={tipo} seccionHref={`/inventario/${segmento}`} />
    </div>
  );
}
