import { requireSection } from "@/lib/session";
import { puedeGestionarDrones } from "@/lib/roles";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/PageHeader";
import { LinkButton } from "@/components/ui/Button";
import { DronesTabla, type DroneFila } from "@/components/forms/DronesTabla";
import type { EstadoDrone } from "@/lib/validation/drones";

export default async function BitacoraPage() {
  const perfil = await requireSection("bitacora");
  // Agregar un drone nuevo (el activo en sí, no los registros que se
  // cargan contra él) queda restringido a Administrador/Gerente
  // General/Soporte IT -- Campo tiene escritura en Bitácora pero solo
  // para crear Registros de Vuelo y Mantenimientos.
  const puedeAgregarDrone = puedeGestionarDrones(perfil.rol);

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

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Bitácora"
        description="Registro de los drones de la flota."
        action={puedeAgregarDrone ? <LinkButton href="/bitacora/nuevo">+ Nuevo drone</LinkButton> : undefined}
      />
      <DronesTabla drones={drones} />
    </div>
  );
}
