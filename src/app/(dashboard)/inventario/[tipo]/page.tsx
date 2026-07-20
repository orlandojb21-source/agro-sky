import { requireSection } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { tipoDesdeSegmento, etiquetaDeTipo } from "@/lib/inventario-tipo";
import { PageHeader } from "@/components/ui/PageHeader";
import { LinkButton } from "@/components/ui/Button";
import { ProductoTabla, type ProductoFila } from "@/components/forms/ProductoTabla";

export default async function InventarioSeccionPage({
  params,
}: {
  params: Promise<{ tipo: string }>;
}) {
  const { tipo: segmento } = await params;
  await requireSection("inventario");
  const tipo = tipoDesdeSegmento(segmento);

  const supabase = await createClient();
  const { data } = await supabase
    .from("productos")
    .select("id, numero_parte, descripcion, cantidad, costo, venta, fila, contenedor, unidad")
    .eq("tipo", tipo)
    .order("numero_parte");

  const productos: ProductoFila[] = (data ?? []).map((p) => ({
    id: p.id as string,
    numeroParte: p.numero_parte as string,
    descripcion: p.descripcion as string,
    cantidad: p.cantidad as number,
    costo: Number(p.costo),
    venta: Number(p.venta),
    fila: p.fila as string | null,
    contenedor: p.contenedor as string | null,
    unidad: p.unidad as string | null,
  }));

  const seccionHref = `/inventario/${segmento}`;
  const titulo = `Inventario — ${etiquetaDeTipo(tipo)}`;

  return (
    <div>
      <PageHeader
        title={titulo}
        action={
          <LinkButton href={`${seccionHref}/nuevo`}>
            + Nuevo producto
          </LinkButton>
        }
      />
      <ProductoTabla
        productos={productos}
        seccion={segmento}
        seccionHref={seccionHref}
        titulo={titulo}
      />
    </div>
  );
}
