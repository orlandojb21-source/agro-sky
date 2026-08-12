import Link from "next/link";
import { requireSection } from "@/lib/session";
import { canWrite } from "@/lib/roles";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/PageHeader";
import { LinkButton } from "@/components/ui/Button";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { DeleteButton } from "@/components/ui/DeleteButton";
import {
  eliminarMantenimientoPreventivoAction,
  eliminarMantenimientoCorrectivoAction,
} from "@/lib/actions/dronesMantenimiento";
import { formatDateOnly } from "@/lib/format";

type EstadoPreventivoFila = {
  id: string;
  droneId: string;
  droneNombre: string;
  tipo: string;
  fecha: string;
  intervaloHoras: number | null;
  intervaloHectareas: number | null;
  intervaloVuelos: number | null;
  intervaloMeses: number | null;
  vencido: boolean;
};

type CorrectivoFila = {
  id: string;
  fecha: string;
  droneNombre: string;
  motivo: string;
  piezas: string;
};

function descripcionIntervalo(f: EstadoPreventivoFila): string {
  const partes: string[] = [];
  if (f.intervaloHoras) partes.push(`cada ${f.intervaloHoras} hrs`);
  if (f.intervaloHectareas) partes.push(`cada ${f.intervaloHectareas} ha`);
  if (f.intervaloVuelos) partes.push(`cada ${f.intervaloVuelos} vuelos`);
  if (f.intervaloMeses) partes.push(`cada ${f.intervaloMeses} meses`);
  return partes.join(" · ");
}

export default async function MantenimientoPage() {
  const perfil = await requireSection("bitacora");
  const puedeEscribir = canWrite(perfil.rol, "bitacora");

  const supabase = await createClient();
  const [{ data: estadoData }, { data: correctivosData }] = await Promise.all([
    supabase
      .from("drones_mantenimientos_preventivos_estado")
      .select(
        "id, drone_id, drone_nombre, tipo, fecha, intervalo_horas, intervalo_hectareas, intervalo_vuelos, intervalo_meses, vencido",
      )
      .order("drone_nombre")
      .order("tipo"),
    supabase
      .from("drones_mantenimientos_correctivos")
      .select("id, fecha, motivo, drones ( nombre ), drones_mantenimientos_correctivos_piezas ( descripcion, cantidad )")
      .order("fecha", { ascending: false })
      .order("creado_en", { ascending: false }),
  ]);

  const estado: EstadoPreventivoFila[] = (estadoData ?? []).map((f) => ({
    id: f.id as string,
    droneId: f.drone_id as string,
    droneNombre: f.drone_nombre as string,
    tipo: f.tipo as string,
    fecha: f.fecha as string,
    intervaloHoras: f.intervalo_horas === null ? null : Number(f.intervalo_horas),
    intervaloHectareas: f.intervalo_hectareas === null ? null : Number(f.intervalo_hectareas),
    intervaloVuelos: f.intervalo_vuelos as number | null,
    intervaloMeses: f.intervalo_meses as number | null,
    vencido: f.vencido as boolean,
  }));
  const vencidos = estado.filter((f) => f.vencido);

  const correctivos: CorrectivoFila[] = (correctivosData ?? []).map((c) => ({
    id: c.id as string,
    fecha: c.fecha as string,
    droneNombre: (c.drones as unknown as { nombre: string } | null)?.nombre ?? "—",
    motivo: c.motivo as string,
    piezas: (
      (c.drones_mantenimientos_correctivos_piezas as unknown as { descripcion: string; cantidad: number }[]) ?? []
    )
      .map((p) => `${p.descripcion} (x${p.cantidad})`)
      .join(", "),
  }));

  const columnasPreventivo: Column<EstadoPreventivoFila>[] = [
    { header: "Drone", render: (f) => <Link href={`/bitacora/${f.droneId}`} className="hover:underline">{f.droneNombre}</Link> },
    { header: "Tipo", render: (f) => f.tipo },
    { header: "Último", render: (f) => formatDateOnly(f.fecha) },
    { header: "Intervalo", render: (f) => descripcionIntervalo(f) },
    {
      header: "Estado",
      render: (f) =>
        f.vencido ? (
          <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800 dark:bg-red-900/40 dark:text-red-300">
            Vencido
          </span>
        ) : (
          <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800 dark:bg-green-900/40 dark:text-green-300">
            Al día
          </span>
        ),
    },
    ...(puedeEscribir
      ? [
          {
            header: "",
            render: (f: EstadoPreventivoFila) => (
              <DeleteButton
                action={eliminarMantenimientoPreventivoAction.bind(null, f.id)}
                confirmMessage="¿Eliminar este mantenimiento preventivo? Esta acción no se puede deshacer."
              />
            ),
          },
        ]
      : []),
  ];

  const columnasCorrectivo: Column<CorrectivoFila>[] = [
    { header: "Fecha", render: (c) => formatDateOnly(c.fecha) },
    { header: "Drone", render: (c) => c.droneNombre },
    { header: "Motivo", render: (c) => c.motivo },
    { header: "Piezas cambiadas", render: (c) => c.piezas || "—" },
    ...(puedeEscribir
      ? [
          {
            header: "",
            render: (c: CorrectivoFila) => (
              <DeleteButton
                action={eliminarMantenimientoCorrectivoAction.bind(null, c.id)}
                confirmMessage="¿Eliminar este mantenimiento correctivo? Las piezas cambiadas vuelven a sumarse al stock de Inventario. Esta acción no se puede deshacer."
              />
            ),
          },
        ]
      : []),
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Mantenimiento"
        description="Preventivo (por horas/hectáreas/vuelos/meses) y Correctivo (cambio de piezas, resta stock de Inventario)."
        action={
          puedeEscribir ? (
            <div className="flex flex-wrap gap-2">
              <LinkButton href="/bitacora/mantenimiento/preventivo/nuevo">+ Mantenimiento Preventivo</LinkButton>
              <LinkButton href="/bitacora/mantenimiento/correctivo/nuevo" variant="secondary">
                + Mantenimiento Correctivo
              </LinkButton>
            </div>
          ) : undefined
        }
      />

      {vencidos.length > 0 && (
        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 shadow-sm dark:border-red-900/40 dark:bg-red-950/20">
          <span className="text-2xl">⚠️</span>
          <div>
            <p className="text-sm font-medium text-red-800 dark:text-red-300">
              {vencidos.length} mantenimiento{vencidos.length > 1 ? "s" : ""} preventivo{vencidos.length > 1 ? "s" : ""} vencido
              {vencidos.length > 1 ? "s" : ""}
            </p>
            <p className="text-xs text-red-700/80 dark:text-red-400/80">
              {vencidos.map((f) => `${f.droneNombre} — ${f.tipo}`).join(" · ")}
            </p>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-green-700/80 dark:text-green-300/80">
          Preventivo — estado por dron y tipo
        </h2>
        <DataTable
          rows={estado}
          columns={columnasPreventivo}
          emptyMessage="Todavía no hay mantenimientos preventivos registrados."
        />
      </div>

      <div className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-green-700/80 dark:text-green-300/80">
          Correctivo — historial
        </h2>
        <DataTable
          rows={correctivos}
          columns={columnasCorrectivo}
          emptyMessage="Todavía no hay mantenimientos correctivos registrados."
        />
      </div>
    </div>
  );
}
