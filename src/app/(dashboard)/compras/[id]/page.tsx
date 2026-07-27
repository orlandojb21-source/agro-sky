import { notFound } from "next/navigation";
import { requireSection } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { LinkButton } from "@/components/ui/Button";
import { DeleteButton } from "@/components/ui/DeleteButton";
import { FormError } from "@/components/ui/FormError";
import { FormularioAprobarSolicitud } from "@/components/forms/FormularioAprobarSolicitud";
import { FormularioRechazarSolicitud } from "@/components/forms/FormularioRechazarSolicitud";
import { eliminarSolicitudAction } from "@/lib/actions/compras";
import { esSoporteOJefe } from "@/lib/roles";
import { formatDateOnly } from "@/lib/format";

export default async function DetalleSolicitudCompraPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error } = await searchParams;
  const perfil = await requireSection("compras");

  const supabase = await createClient();
  const [{ data: solicitud }, { data: items }] = await Promise.all([
    supabase
      .from("solicitudes_compra")
      .select("id, numero_solicitud, fecha, nota, estado, motivo_rechazo, orden_id")
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("solicitud_compra_items")
      .select("id, tipo, numero_parte, descripcion, cantidad_actual, cantidad_solicitada")
      .eq("solicitud_id", id)
      .order("id"),
  ]);

  if (!solicitud) notFound();

  const pendiente = solicitud.estado === "pendiente";
  const aprobada = solicitud.estado === "aprobada";
  const rechazada = solicitud.estado === "rechazada";

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold text-green-900 dark:text-green-50">
            Solicitud No. {String(solicitud.numero_solicitud).padStart(4, "0")} —{" "}
            {formatDateOnly(solicitud.fecha as string)}
          </h1>
          {pendiente && (
            <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-700 dark:bg-amber-500/10 dark:text-amber-400">
              Pendiente
            </span>
          )}
          {aprobada && (
            <span className="rounded-full bg-green-100 px-2.5 py-1 text-xs font-medium text-green-700 dark:bg-green-500/10 dark:text-green-400">
              Aprobada
            </span>
          )}
          {rechazada && (
            <span className="rounded-full bg-red-100 px-2.5 py-1 text-xs font-medium text-red-700 dark:bg-red-500/10 dark:text-red-400">
              Rechazada
            </span>
          )}
        </div>
        <LinkButton href="/compras" variant="secondary">
          Volver
        </LinkButton>
      </div>

      <FormError message={error} />

      {aprobada && solicitud.orden_id ? (
        <div className="rounded-xl border border-green-100 bg-green-50/60 p-4 text-sm dark:border-green-900/40 dark:bg-green-950/20">
          Esta solicitud ya se aprobó y se convirtió en una orden de compra.{" "}
          <LinkButton href={`/compras/ordenes/${solicitud.orden_id}`} variant="secondary">
            Ver orden de compra
          </LinkButton>
        </div>
      ) : null}

      {rechazada ? (
        <div className="rounded-xl border border-red-100 bg-red-50/60 p-4 text-sm text-red-800 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-200">
          Esta solicitud fue rechazada.
          {solicitud.motivo_rechazo ? ` Motivo: ${solicitud.motivo_rechazo as string}` : ""}
        </div>
      ) : null}

      {solicitud.nota ? (
        <div className="rounded-xl border border-green-100 bg-white p-6 shadow-sm dark:border-green-900/40 dark:bg-green-950/10">
          <p className="text-xs uppercase tracking-wide text-green-700/70 dark:text-green-300/70">
            Nota
          </p>
          <p className="text-green-900 dark:text-green-50">{solicitud.nota as string}</p>
        </div>
      ) : null}

      <div className="overflow-hidden rounded-xl border border-green-100 bg-white shadow-sm dark:border-green-900/40 dark:bg-green-950/10">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px] text-left text-sm">
            <thead>
              <tr className="border-b border-green-100 bg-green-50 text-xs uppercase tracking-wide text-green-700 dark:border-green-900/40 dark:bg-green-950/30 dark:text-green-300">
                <th className="px-3 py-2 font-medium">Código</th>
                <th className="px-3 py-2 font-medium">Descripción</th>
                <th className="px-3 py-2 font-medium">Sección</th>
                <th className="px-3 py-2 font-medium">Stock al pedir</th>
                <th className="px-3 py-2 font-medium">Cantidad solicitada</th>
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
                  <td className="px-3 py-3 text-green-800/80 dark:text-green-200/80">
                    {it.cantidad_actual as number}
                  </td>
                  <td className="px-3 py-3 font-medium text-green-900 dark:text-green-50">
                    {it.cantidad_solicitada as number}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {pendiente && (
        <div className="flex flex-col gap-3">
          {esSoporteOJefe(perfil.rol) && (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <FormularioAprobarSolicitud id={solicitud.id as string} />
              <FormularioRechazarSolicitud id={solicitud.id as string} />
            </div>
          )}
          <DeleteButton
            action={eliminarSolicitudAction.bind(null, solicitud.id as string)}
            confirmMessage="¿Eliminar esta solicitud de compra? Esta acción no se puede deshacer."
          />
        </div>
      )}
    </div>
  );
}
