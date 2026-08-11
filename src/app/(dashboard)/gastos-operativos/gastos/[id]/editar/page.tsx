import { notFound } from "next/navigation";
import { requireWrite } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { obtenerCategoriasGasto } from "@/lib/categorias";
import { GastoForm } from "@/components/forms/GastoForm";

const BUCKET_COMPROBANTES = "gastos-comprobantes";
const DURACION_URL_FIRMADA_SEG = 3600;

export default async function EditarGastoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await requireWrite("gastos-operativos");

  const supabase = await createClient();
  const [{ data: gasto }, { data: proveedores }, categorias] = await Promise.all([
    supabase
      .from("gastos")
      .select("id, fecha, proveedor_id, categoria, categoria_otro, numero_factura, monto, descripcion, comprobante_ruta")
      .eq("id", id)
      .maybeSingle(),
    supabase.from("proveedores").select("id, nombre").order("nombre"),
    obtenerCategoriasGasto(supabase, "compras"),
  ]);

  if (!gasto) notFound();

  let comprobanteUrl: string | null = null;
  if (gasto.comprobante_ruta) {
    const { data } = await supabase.storage
      .from(BUCKET_COMPROBANTES)
      .createSignedUrl(gasto.comprobante_ruta as string, DURACION_URL_FIRMADA_SEG);
    comprobanteUrl = data?.signedUrl ?? null;
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold text-green-900 dark:text-green-50">Editar gasto</h1>
      <GastoForm
        proveedores={(proveedores ?? []).map((p) => ({ id: p.id as string, nombre: p.nombre as string }))}
        categorias={categorias}
        fechaHoy={new Date().toISOString().slice(0, 10)}
        valoresIniciales={{
          id: gasto.id as string,
          fecha: gasto.fecha as string,
          proveedorId: gasto.proveedor_id as string | null,
          categoria: gasto.categoria as string,
          categoriaOtro: gasto.categoria_otro as string | null,
          numeroFactura: gasto.numero_factura as string | null,
          monto: Number(gasto.monto),
          descripcion: gasto.descripcion as string | null,
          comprobanteRuta: gasto.comprobante_ruta as string | null,
          comprobanteUrl,
        }}
      />
    </div>
  );
}
