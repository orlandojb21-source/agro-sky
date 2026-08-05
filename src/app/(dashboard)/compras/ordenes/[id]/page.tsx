import { notFound } from "next/navigation";
import { requireSection } from "@/lib/session";
import { canWrite } from "@/lib/roles";
import { createClient } from "@/lib/supabase/server";
import { LinkButton } from "@/components/ui/Button";
import { DeleteButton } from "@/components/ui/DeleteButton";
import { FormError } from "@/components/ui/FormError";
import { BotonExportarOrdenCompra } from "@/components/forms/BotonExportarOrdenCompra";
import { BotonConfirmarRecepcion } from "@/components/forms/BotonConfirmarRecepcion";
import { eliminarOrdenAction } from "@/lib/actions/compras";
import { formatDate, formatDateOnly } from "@/lib/format";
import type { OrdenCompraExportable } from "@/lib/exportar";

export default async function DetalleOrdenCompraPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error } = await searchParams;
  const perfil = await requireSection("compras");
  const puedeEscribir = canWrite(perfil.rol, "compras");

  const supabase = await createClient();
  const [{ data: orden }, { data: items }] = await Promise.all([
    supabase
      .from("ordenes_compra")
      .select("id, numero_orden, fecha, proveedor_nombre, proveedor_contacto, estado, recibida_en")
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("orden_compra_items")
      .select("id, tipo, numero_parte, descripcion, cantidad")
      .eq("orden_id", id)
      .order("id"),
  ]);

  if (!orden) notFound();

  const pendiente = orden.estado === "pendiente_recepcion";

  const ordenExportable: OrdenCompraExportable = {
    numeroOrden: orden.numero_orden as number,
    fecha: orden.fecha as string,
    proveedorNombre: orden.proveedor_nombre as string,
    proveedorContacto: orden.proveedor_contacto as string | null,
    items: (items ?? []).map((it) => ({
      codigo: it.numero_parte as string,
      descripcion: it.descripcion as string,
      cantidad: it.cantidad as number,
    })),
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold text-green-900 dark:text-green-50">
            Orden de Compra No. {String(orden.numero_orden).padStart(4, "0")} —{" "}
            {formatDateOnly(orden.fecha as string)}
          </h1>
          {pendiente ? (
            <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-700 dark:bg-amber-500/10 dark:text-amber-400">
              Pendiente de recepción
            </span>
          ) : (
            <span className="rounded-full bg-green-100 px-2.5 py-1 text-xs font-medium text-green-700 dark:bg-green-500/10 dark:text-green-400">
              Recibida
            </span>
          )}
        </div>
        <div className="flex gap-2">
          <BotonExportarOrdenCompra orden={ordenExportable} />
          <LinkButton href="/compras/ordenes" variant="secondary">
            Volver
          </LinkButton>
        </div>
      </div>

      <FormError message={error} />

      {!pendiente && orden.recibida_en ? (
        <div className="rounded-xl border border-green-100 bg-green-50/60 p-4 text-sm dark:border-green-900/40 dark:bg-green-950/20">
          Mercancía recibida el {formatDate(orden.recibida_en as string)}. El inventario ya fue
          actualizado automáticamente.
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 rounded-xl border border-green-100 bg-white p-6 shadow-sm sm:grid-cols-2 dark:border-green-900/40 dark:bg-green-950/10">
        <div>
          <p className="text-xs uppercase tracking-wide text-green-700/70 dark:text-green-300/70">
            Proveedor
          </p>
          <p className="text-green-900 dark:text-green-50">{orden.proveedor_nombre as string}</p>
        </div>
        {orden.proveedor_contacto ? (
          <div>
            <p className="text-xs uppercase tracking-wide text-green-700/70 dark:text-green-300/70">
              Contacto
            </p>
            <p className="text-green-900 dark:text-green-50">
              {orden.proveedor_contacto as string}
            </p>
          </div>
        ) : null}
      </div>

      <div className="overflow-hidden rounded-xl border border-green-100 bg-white shadow-sm dark:border-green-900/40 dark:bg-green-950/10">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px] text-left text-sm">
            <thead>
              <tr className="border-b border-green-100 bg-green-50 text-xs uppercase tracking-wide text-green-700 dark:border-green-900/40 dark:bg-green-950/30 dark:text-green-300">
                <th className="px-3 py-2 font-medium">Código</th>
                <th className="px-3 py-2 font-medium">Descripción</th>
                <th className="px-3 py-2 font-medium">Sección</th>
                <th className="px-3 py-2 font-medium">Cantidad</th>
              </tr>
            </thead>
            <tbody>
              {(items ?? []).map((it) => (
                <tr
                  key={it.id as string}
                  className="border-b border-green-50 last:border-0 dark:border-green-900/30"
                >
                  <td className="px-3 py-3 text-green-900 dark:text-green-50">
                    {it.numero_parte as string}
                  </td>
                  <td className="px-3 py-3 text-green-800/80 dark:text-green-200/80">
                    {it.descripcion as string}
                  </td>
                  <td className="px-3 py-3 capitalize text-green-800/80 dark:text-green-200/80">
                    {it.tipo as string}
                  </td>
                  <td className="px-3 py-3 font-medium text-green-900 dark:text-green-50">
                    {it.cantidad as number}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {pendiente && puedeEscribir && (
        <div className="flex flex-wrap gap-3">
          <BotonConfirmarRecepcion id={orden.id as string} />
          <DeleteButton
            action={eliminarOrdenAction.bind(null, orden.id as string)}
            confirmMessage="¿Eliminar esta orden de compra? Esta acción no se puede deshacer."
          />
        </div>
      )}
    </div>
  );
}
