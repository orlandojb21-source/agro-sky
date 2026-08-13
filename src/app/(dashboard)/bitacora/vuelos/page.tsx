import Link from "next/link";
import { requireSection } from "@/lib/session";
import { canWrite, puedeGestionarDrones } from "@/lib/roles";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/PageHeader";
import { LinkButton } from "@/components/ui/Button";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { DeleteButton } from "@/components/ui/DeleteButton";
import { eliminarRegistroVueloAction } from "@/lib/actions/dronesVuelos";
import { formatDateOnly } from "@/lib/format";

type RegistroFila = {
  id: string;
  fecha: string;
  droneNombre: string;
  operador: string;
  areaCubierta: number;
  areaDelta: number;
  horasVuelo: number;
  horasDelta: number;
  vuelos: number;
  vuelosDelta: number;
};

function formatDelta(d: number): string {
  return d >= 0 ? `+${d}` : String(d);
}

export default async function RegistroVueloPage({
  searchParams,
}: {
  searchParams: Promise<{ drone?: string }>;
}) {
  const { drone: droneIdFiltro } = await searchParams;
  const perfil = await requireSection("bitacora");
  const puedeEscribir = canWrite(perfil.rol, "bitacora");
  // Editar/eliminar registros de vuelo queda restringido a Administrador,
  // Gerente General y Soporte IT -- más angosto que la escritura general
  // de Bitácora (que también tiene Campo, pero solo para crear).
  const puedeEditarEliminar = puedeGestionarDrones(perfil.rol);

  const supabase = await createClient();
  let consulta = supabase
    .from("drones_vuelos")
    .select(
      "id, fecha, operador, area_cubierta, area_delta, horas_vuelo, horas_delta, vuelos, vuelos_delta, drones ( nombre )",
    )
    .order("fecha", { ascending: false })
    .order("creado_en", { ascending: false });
  if (droneIdFiltro) consulta = consulta.eq("drone_id", droneIdFiltro);
  const { data } = await consulta;

  const registros: RegistroFila[] = (data ?? []).map((r) => ({
    id: r.id as string,
    fecha: r.fecha as string,
    droneNombre: (r.drones as unknown as { nombre: string } | null)?.nombre ?? "—",
    operador: r.operador as string,
    areaCubierta: Number(r.area_cubierta),
    areaDelta: Number(r.area_delta),
    horasVuelo: Number(r.horas_vuelo),
    horasDelta: Number(r.horas_delta),
    vuelos: r.vuelos as number,
    vuelosDelta: r.vuelos_delta as number,
  }));

  const columns: Column<RegistroFila>[] = [
    { header: "Fecha", render: (r) => formatDateOnly(r.fecha) },
    { header: "Drone", render: (r) => r.droneNombre },
    { header: "Operador", render: (r) => r.operador },
    { header: "Área Cubierta", render: (r) => `${r.areaCubierta} ha (${formatDelta(r.areaDelta)})` },
    { header: "Horas de Vuelo", render: (r) => `${r.horasVuelo} (${formatDelta(r.horasDelta)})` },
    { header: "Vuelos", render: (r) => `${r.vuelos} (${formatDelta(r.vuelosDelta)})` },
    ...(puedeEditarEliminar
      ? [
          {
            header: "",
            render: (r: RegistroFila) => (
              <div className="flex gap-3">
                <Link
                  href={`/bitacora/vuelos/${r.id}/editar`}
                  className="text-sm text-green-700 hover:underline dark:text-green-300"
                >
                  Editar
                </Link>
                <DeleteButton
                  action={eliminarRegistroVueloAction.bind(null, r.id)}
                  confirmMessage="¿Eliminar este registro de vuelo? Se recalculan las diferencias de los registros posteriores de ese drone. Esta acción no se puede deshacer."
                />
              </div>
            ),
          },
        ]
      : []),
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Registro de Vuelo"
        description="Cada fila es una lectura cargada por un trabajo -- el paréntesis muestra la diferencia contra la lectura anterior de ese drone."
        action={
          puedeEscribir ? <LinkButton href="/bitacora/vuelos/nuevo">+ Registro de Vuelo</LinkButton> : undefined
        }
      />
      <DataTable rows={registros} columns={columns} emptyMessage="Todavía no hay registros de vuelo." />
    </div>
  );
}
