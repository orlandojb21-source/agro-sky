import Link from "next/link";
import { requireSection } from "@/lib/session";
import { canWrite } from "@/lib/roles";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/PageHeader";
import { LinkButton } from "@/components/ui/Button";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { EstadoDroneBadge } from "@/components/ui/EstadoDroneBadge";
import type { EstadoDrone } from "@/lib/validation/drones";

type DroneFila = {
  id: string;
  nombre: string;
  modelo: string;
  operadorActual: string | null;
  areaCubierta: number;
  horasVuelo: number;
  vuelos: number;
  estado: EstadoDrone;
  estadoDetalle: string | null;
};

export default async function BitacoraPage() {
  const perfil = await requireSection("bitacora");
  const puedeEscribir = canWrite(perfil.rol, "bitacora");

  const supabase = await createClient();
  const [{ data: dronesData }, { data: asignacionesData }] = await Promise.all([
    supabase
      .from("drones")
      .select("id, nombre, modelo, area_cubierta, horas_vuelo, vuelos, estado, estado_detalle")
      .order("nombre"),
    supabase.from("drones_operadores").select("drone_id, operador").is("fecha_hasta", null),
  ]);

  const operadorActualPorDrone = new Map(
    (asignacionesData ?? []).map((a) => [a.drone_id as string, a.operador as string]),
  );

  const drones: DroneFila[] = (dronesData ?? []).map((d) => ({
    id: d.id as string,
    nombre: d.nombre as string,
    modelo: d.modelo as string,
    operadorActual: operadorActualPorDrone.get(d.id as string) ?? null,
    areaCubierta: Number(d.area_cubierta),
    horasVuelo: Number(d.horas_vuelo),
    vuelos: d.vuelos as number,
    estado: d.estado as EstadoDrone,
    estadoDetalle: d.estado_detalle as string | null,
  }));

  const columns: Column<DroneFila>[] = [
    { header: "Nombre", render: (d) => d.nombre },
    { header: "Modelo", render: (d) => d.modelo },
    { header: "Estado", render: (d) => <EstadoDroneBadge estado={d.estado} detalle={d.estadoDetalle} /> },
    { header: "Operador asignado", render: (d) => d.operadorActual ?? "Sin asignar" },
    { header: "Área Cubierta", render: (d) => `${d.areaCubierta} ha` },
    { header: "Horas de Vuelo", render: (d) => d.horasVuelo },
    { header: "Vuelos", render: (d) => d.vuelos },
    {
      header: "",
      render: (d) => (
        <Link href={`/bitacora/${d.id}`} className="text-sm text-green-700 hover:underline dark:text-green-300">
          Ver
        </Link>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Bitácora"
        description="Registro de los drones de la flota."
        action={puedeEscribir ? <LinkButton href="/bitacora/nuevo">+ Nuevo drone</LinkButton> : undefined}
      />
      <DataTable rows={drones} columns={columns} emptyMessage="Todavía no hay drones registrados." />
    </div>
  );
}
