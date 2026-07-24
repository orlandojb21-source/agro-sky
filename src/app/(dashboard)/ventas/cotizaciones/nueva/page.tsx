import { requireSection } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { VentaForm, type CatalogoProducto, type CatalogoServicio } from "@/components/forms/VentaForm";

export default async function NuevaCotizacionPage() {
  await requireSection("ventas");

  const supabase = await createClient();
  const [{ data: productos }, { data: servicios }] = await Promise.all([
    supabase
      .from("productos")
      .select("id, tipo, numero_parte, descripcion, cantidad, venta")
      .order("numero_parte"),
    supabase.from("servicios").select("id, nombre, descripcion, precio").order("nombre"),
  ]);

  const aCatalogoProducto = (p: { id: string; numero_parte: string; descripcion: string; cantidad: number; venta: number }): CatalogoProducto => ({
    id: p.id,
    numeroParte: p.numero_parte,
    descripcion: p.descripcion,
    cantidad: p.cantidad,
    venta: Number(p.venta),
  });

  const productosNuevos: CatalogoProducto[] = (productos ?? [])
    .filter((p) => p.tipo === "nuevo")
    .map(aCatalogoProducto);
  const productosUsados: CatalogoProducto[] = (productos ?? [])
    .filter((p) => p.tipo === "usado")
    .map(aCatalogoProducto);

  const catalogoServicios: CatalogoServicio[] = (servicios ?? []).map((s) => ({
    id: s.id as string,
    nombre: s.nombre as string,
    descripcion: s.descripcion as string | null,
    precio: s.precio === null ? null : Number(s.precio),
  }));

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-green-900 dark:text-green-50">
        Nueva cotización
      </h1>
      <VentaForm
        fechaHoy={new Date().toISOString().slice(0, 10)}
        productosNuevos={productosNuevos}
        productosUsados={productosUsados}
        servicios={catalogoServicios}
        modo="cotizacion"
      />
    </div>
  );
}
