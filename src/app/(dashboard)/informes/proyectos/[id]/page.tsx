import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSection } from "@/lib/session";
import { canWrite } from "@/lib/roles";
import { createClient } from "@/lib/supabase/server";
import { LinkButton } from "@/components/ui/Button";
import { formatDateOnly } from "@/lib/format";

function etiquetaTipo(tipo: "ingenio_santa_rosa" | "particular") {
  return tipo === "ingenio_santa_rosa" ? "Ingenio Santa Rosa" : "Trabajo Particular";
}

function BadgeEstado({ estado }: { estado: "abierto" | "cerrado" }) {
  if (estado === "abierto") {
    return (
      <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800 dark:bg-green-900/40 dark:text-green-300">
        Abierto
      </span>
    );
  }
  return (
    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700 dark:bg-gray-800/60 dark:text-gray-300">
      Cerrado
    </span>
  );
}

export default async function DetalleProyectoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const perfil = await requireSection("informes");
  const puedeEscribir = canWrite(perfil.rol, "informes") && perfil.rol !== "campo";

  const supabase = await createClient();
  const [{ data: proyecto }, { data: informesData }] = await Promise.all([
    supabase
      .from("proyectos")
      .select("id, codigo, nombre, tipo_proyecto, estado, clientes ( nombre )")
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("informes_campo")
      .select("id, fecha, finca, operador, informe_campo_parcelas ( hectareas )")
      .eq("proyecto_id", id)
      .order("fecha", { ascending: false }),
  ]);

  if (!proyecto) notFound();

  const clienteNombre = (proyecto.clientes as unknown as { nombre: string } | null)?.nombre ?? "—";

  const informes = (informesData ?? []).map((i) => ({
    id: i.id as string,
    fecha: i.fecha as string,
    finca: i.finca as string,
    operador: i.operador as string,
    hectareas: ((i.informe_campo_parcelas ?? []) as { hectareas: number }[]).reduce(
      (s, p) => s + Number(p.hectareas),
      0,
    ),
  }));
  const totalHectareas = informes.reduce((s, i) => s + i.hectareas, 0);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold text-green-900 dark:text-green-50">
              {proyecto.codigo as string} — {proyecto.nombre as string}
            </h1>
            <BadgeEstado estado={proyecto.estado as "abierto" | "cerrado"} />
          </div>
          <p className="mt-1 text-sm text-green-700/70 dark:text-green-200/70">
            {clienteNombre} · {etiquetaTipo(proyecto.tipo_proyecto as "ingenio_santa_rosa" | "particular")}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {puedeEscribir && (
            <LinkButton href={`/informes/proyectos/${id}/editar`} variant="secondary">
              Editar
            </LinkButton>
          )}
          <LinkButton href="/informes/proyectos" variant="secondary">
            Volver
          </LinkButton>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-green-100 bg-white shadow-sm dark:border-green-900/40 dark:bg-green-950/10">
        <h2 className="border-b border-green-100 bg-green-50 px-4 py-3 text-sm font-semibold text-green-900 dark:border-green-900/40 dark:bg-green-950/30 dark:text-green-50">
          Informes de Campo ({informes.length})
        </h2>
        {informes.length === 0 ? (
          <p className="px-4 py-6 text-sm text-green-700/70 dark:text-green-200/70">
            Todavía no hay ningún Informe de Campo ligado a este proyecto.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead>
                <tr className="border-b border-green-100 text-xs uppercase tracking-wide text-green-700 dark:border-green-900/40 dark:text-green-300">
                  <th className="px-4 py-2 font-medium">Fecha</th>
                  <th className="px-4 py-2 font-medium">Finca</th>
                  <th className="px-4 py-2 font-medium">Operador</th>
                  <th className="px-4 py-2 font-medium">Hectáreas</th>
                  <th className="px-4 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {informes.map((i) => (
                  <tr key={i.id} className="border-b border-green-50 last:border-0 dark:border-green-900/30">
                    <td className="px-4 py-3 text-green-900 dark:text-green-50">{formatDateOnly(i.fecha)}</td>
                    <td className="px-4 py-3 text-green-800/80 dark:text-green-200/80">{i.finca}</td>
                    <td className="px-4 py-3 text-green-800/80 dark:text-green-200/80">{i.operador}</td>
                    <td className="px-4 py-3 text-green-800/80 dark:text-green-200/80">{i.hectareas}</td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/informes/campo/${i.id}`}
                        className="text-sm text-green-700 hover:underline dark:text-green-300"
                      >
                        Ver
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-green-200/60 font-semibold dark:border-green-800/60">
                  <td className="px-4 py-2 text-green-900 dark:text-green-50" colSpan={3}>
                    total
                  </td>
                  <td className="px-4 py-2 text-green-700 dark:text-green-400">{totalHectareas}</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
