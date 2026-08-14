import { notFound } from "next/navigation";
import { requireWrite } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { obtenerCategoriasGasto } from "@/lib/categorias";
import { MovimientoForm } from "@/components/forms/MovimientoForm";

type FilaProyecto = {
  id: string;
  codigo: string;
  nombre: string;
  clientes: { nombre: string } | null;
};

export default async function EditarMovimientoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await requireWrite("gastos-operativos");

  const supabase = await createClient();
  const [{ data: gasto }, { data: colaboradoresData }, { data: proveedoresData }, { data: proyectosData }, categorias] =
    await Promise.all([
      supabase
        .from("caja_gastos")
        .select(
          "id, fecha, categoria, nombre, proveedor_id, proyecto_id, numero_recibo, concepto, monto_detalle, colaborador, previsto, entregado_detalle, vuelto_detalle, nota",
        )
        .eq("id", id)
        .maybeSingle(),
      supabase.from("colaboradores").select("nombre").order("nombre"),
      supabase.from("proveedores").select("id, nombre").order("nombre"),
      supabase.from("proyectos").select("id, codigo, nombre, clientes ( nombre )").order("codigo"),
      obtenerCategoriasGasto(supabase, "caja_menuda"),
    ]);

  if (!gasto) notFound();

  const colaboradores = (colaboradoresData ?? []).map((c) => c.nombre as string);
  const proveedores = (proveedoresData ?? []).map((p) => ({ id: p.id as string, nombre: p.nombre as string }));
  const proyectos = ((proyectosData ?? []) as unknown as FilaProyecto[]).map((p) => ({
    id: p.id,
    codigo: p.codigo,
    nombre: p.nombre,
    clienteNombre: p.clientes?.nombre ?? "—",
  }));

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-green-900 dark:text-green-50">
        Editar movimiento
      </h1>
      <MovimientoForm
        fechaHoy={gasto.fecha}
        colaboradores={colaboradores}
        proveedores={proveedores}
        proyectos={proyectos}
        categorias={categorias}
        valoresIniciales={{
          id: gasto.id,
          fecha: gasto.fecha,
          categoria: gasto.categoria,
          nombre: gasto.nombre,
          proveedorId: gasto.proveedor_id,
          proyectoId: gasto.proyecto_id,
          numeroRecibo: gasto.numero_recibo,
          concepto: gasto.concepto,
          montoDetalle: gasto.monto_detalle as Record<string, number> | null,
          colaborador: gasto.colaborador,
          previsto: gasto.previsto === null ? null : Number(gasto.previsto),
          entregadoDetalle: gasto.entregado_detalle as Record<string, number> | null,
          vueltoDetalle: gasto.vuelto_detalle as Record<string, number> | null,
          nota: gasto.nota,
        }}
      />
    </div>
  );
}
