import { requireSection } from "@/lib/session";
import { canWrite, puedeGestionarDrones } from "@/lib/roles";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/PageHeader";
import { LinkButton } from "@/components/ui/Button";
import { VuelosTabla, type RegistroFila } from "@/components/forms/VuelosTabla";

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

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Registro de Vuelo"
        description="Cada fila es una lectura cargada por un trabajo -- el paréntesis muestra la diferencia contra la lectura anterior de ese drone."
        action={
          puedeEscribir ? <LinkButton href="/bitacora/vuelos/nuevo">+ Registro de Vuelo</LinkButton> : undefined
        }
      />
      <VuelosTabla registros={registros} puedeEditarEliminar={puedeEditarEliminar} />
    </div>
  );
}
