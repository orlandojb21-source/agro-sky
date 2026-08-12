import { notFound } from "next/navigation";
import Link from "next/link";
import { requireSection } from "@/lib/session";
import { canWrite } from "@/lib/roles";
import { createClient } from "@/lib/supabase/server";
import { LinkButton } from "@/components/ui/Button";
import { DeleteButton } from "@/components/ui/DeleteButton";
import { ReasignarOperadorForm } from "@/components/forms/ReasignarOperadorForm";
import { eliminarDroneAction } from "@/lib/actions/drones";
import { formatDateOnly } from "@/lib/format";

export default async function DetalleDronePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const perfil = await requireSection("bitacora");
  const puedeEscribir = canWrite(perfil.rol, "bitacora");

  const supabase = await createClient();
  const [{ data: drone }, { data: asignacionesData }, { data: colaboradoresData }] = await Promise.all([
    supabase.from("drones").select("*").eq("id", id).maybeSingle(),
    supabase
      .from("drones_operadores")
      .select("id, operador, fecha_desde, fecha_hasta")
      .eq("drone_id", id)
      .order("fecha_desde", { ascending: false }),
    supabase.from("colaboradores").select("nombre").eq("tipo", "campo").order("nombre"),
  ]);

  if (!drone) notFound();

  const colaboradoresCampo = (colaboradoresData ?? []).map((c) => c.nombre as string);
  const asignaciones = asignacionesData ?? [];
  const operadorActual = asignaciones.find((a) => a.fecha_hasta === null)?.operador as string | undefined;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-green-900 dark:text-green-50">
            {drone.nombre as string}
          </h1>
          <p className="mt-1 text-sm text-green-700/70 dark:text-green-200/70">{drone.modelo as string}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {puedeEscribir && (
            <LinkButton href={`/bitacora/${id}/editar`} variant="secondary">
              Editar
            </LinkButton>
          )}
          <LinkButton href="/bitacora" variant="secondary">
            Volver
          </LinkButton>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-green-700/80 dark:text-green-300/80">
          Datos del Drone
        </h2>
        <div className="grid grid-cols-2 gap-4 rounded-xl border border-green-100 bg-white p-6 shadow-sm sm:grid-cols-5 dark:border-green-900/40 dark:bg-green-950/10">
          <div>
            <p className="text-xs uppercase tracking-wide text-green-700/70 dark:text-green-300/70">
              Fecha de activación
            </p>
            <p className="text-green-900 dark:text-green-50">
              {drone.fecha_activacion ? formatDateOnly(drone.fecha_activacion as string) : "—"}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-green-700/70 dark:text-green-300/70">
              N/S de la aeronave
            </p>
            <p className="text-green-900 dark:text-green-50">
              {(drone.numero_serie_aeronave as string | null) || "—"}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-green-700/70 dark:text-green-300/70">
              N/S de la placa del FC
            </p>
            <p className="text-green-900 dark:text-green-50">
              {(drone.numero_serie_placa_fc as string | null) || "—"}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-green-700/70 dark:text-green-300/70">
              N/S de Fábrica
            </p>
            <p className="text-green-900 dark:text-green-50">
              {(drone.numero_serie_fabrica as string | null) || "—"}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-green-700/70 dark:text-green-300/70">
              Operador asignado
            </p>
            <p className="text-green-900 dark:text-green-50">{operadorActual ?? "Sin asignar"}</p>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-green-700/80 dark:text-green-300/80">
            Registro de Vuelo (última lectura)
          </h2>
          <Link
            href={`/bitacora/vuelos?drone=${id}`}
            className="text-sm text-green-700 hover:underline dark:text-green-300"
          >
            Ver historial completo
          </Link>
        </div>
        <p className="-mt-1 text-xs text-green-700/60 dark:text-green-300/60">
          Es un área aparte de Datos del Drone -- estos totales solo cambian cargando un nuevo registro en{" "}
          <Link href={`/bitacora/vuelos/nuevo?drone=${id}`} className="underline">
            + Registro de Vuelo
          </Link>
          , nunca editando el drone.
        </p>
        <div className="grid grid-cols-3 gap-4 rounded-xl border border-green-100 bg-white p-6 shadow-sm dark:border-green-900/40 dark:bg-green-950/10">
          <div>
            <p className="text-xs uppercase tracking-wide text-green-700/70 dark:text-green-300/70">
              Área Cubierta
            </p>
            <p className="text-green-900 dark:text-green-50">{Number(drone.area_cubierta)} ha</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-green-700/70 dark:text-green-300/70">
              Horas de Vuelo
            </p>
            <p className="text-green-900 dark:text-green-50">{Number(drone.horas_vuelo)}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-green-700/70 dark:text-green-300/70">Vuelos</p>
            <p className="text-green-900 dark:text-green-50">{drone.vuelos as number}</p>
          </div>
        </div>
      </div>

      {puedeEscribir && (
        <div className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-green-700/80 dark:text-green-300/80">
            Reasignar operador
          </h2>
          <p className="-mt-1 text-xs text-green-700/60 dark:text-green-300/60">
            Un operador es único por drone a la vez -- si ya está asignado a otro drone (ej. entró a
            mantenimiento), se le quita ahí automáticamente al asignarlo aquí.
          </p>
          <ReasignarOperadorForm
            droneId={id}
            colaboradoresCampo={colaboradoresCampo}
            fechaHoy={new Date().toISOString().slice(0, 10)}
          />
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-green-100 bg-white shadow-sm dark:border-green-900/40 dark:bg-green-950/10">
        <h2 className="border-b border-green-100 bg-green-50 px-4 py-3 text-sm font-semibold text-green-900 dark:border-green-900/40 dark:bg-green-950/30 dark:text-green-50">
          Historial de operadores
        </h2>
        {asignaciones.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-green-700/70 dark:text-green-200/70">
            Todavía no se asignó ningún operador.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[420px] text-left text-sm">
              <thead>
                <tr className="border-b border-green-100 text-xs uppercase tracking-wide text-green-700 dark:border-green-900/40 dark:text-green-300">
                  <th className="px-3 py-2 font-medium">Operador</th>
                  <th className="px-3 py-2 font-medium">Desde</th>
                  <th className="px-3 py-2 font-medium">Hasta</th>
                </tr>
              </thead>
              <tbody>
                {asignaciones.map((a) => (
                  <tr key={a.id as string} className="border-b border-green-50 last:border-0 dark:border-green-900/30">
                    <td className="px-3 py-3 text-green-900 dark:text-green-50">{a.operador as string}</td>
                    <td className="px-3 py-3 text-green-800/80 dark:text-green-200/80">
                      {formatDateOnly(a.fecha_desde as string)}
                    </td>
                    <td className="px-3 py-3 text-green-800/80 dark:text-green-200/80">
                      {a.fecha_hasta ? formatDateOnly(a.fecha_hasta as string) : "Vigente"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {puedeEscribir && (
        <div>
          <DeleteButton
            action={eliminarDroneAction.bind(null, id)}
            confirmMessage={`¿Eliminar ${drone.nombre as string}? Esto también borra su historial de operadores asignados y de registros de vuelo. Esta acción no se puede deshacer.`}
          />
        </div>
      )}
    </div>
  );
}
