import { requireSection } from "@/lib/session";
import { canWrite, puedeGestionarDrones } from "@/lib/roles";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/PageHeader";
import { LinkButton } from "@/components/ui/Button";
import {
  TablaPreventivo,
  TablaCorrectivo,
  type EstadoPreventivoFila,
  type CorrectivoFila,
} from "@/components/forms/MantenimientoTablas";

const BUCKET_IMAGENES_CORRECTIVO = "mantenimientos-correctivos-imagenes";
const DURACION_URL_FIRMADA_SEG = 3600;

export default async function MantenimientoPage() {
  const perfil = await requireSection("bitacora");
  const puedeEscribir = canWrite(perfil.rol, "bitacora");
  // Eliminar un mantenimiento ya cargado queda restringido a
  // Administrador/Gerente General/Soporte IT -- Campo puede crear
  // (botones "+ Mantenimiento..." abajo, en puedeEscribir) pero no borrar.
  const puedeEliminar = puedeGestionarDrones(perfil.rol);

  const supabase = await createClient();
  // PostgREST no soporta anidar 2 relaciones "uno a muchos" hermanas
  // (piezas E imágenes, ambas hijas de drones_mantenimientos_correctivos)
  // en una sola consulta -- da error de SQL inválido ("aggregate
  // functions are not allowed..."). Se consultan por separado y se
  // combinan acá, mismo patrón que parcelas/productos en el detalle de
  // Informe de Campo.
  const [{ data: estadoData }, { data: correctivosData }, { data: piezasData }, { data: imagenesData }] =
    await Promise.all([
      supabase
        .from("drones_mantenimientos_preventivos_estado")
        .select(
          "id, drone_id, drone_nombre, tipo, fecha, intervalo_horas, intervalo_hectareas, intervalo_vuelos, intervalo_meses, vencido",
        )
        .order("drone_nombre")
        .order("tipo"),
      supabase
        .from("drones_mantenimientos_correctivos")
        .select("id, fecha, motivo, drones ( nombre )")
        .order("fecha", { ascending: false })
        .order("creado_en", { ascending: false }),
      supabase.from("drones_mantenimientos_correctivos_piezas").select("correctivo_id, descripcion, cantidad"),
      supabase.from("drones_mantenimientos_correctivos_imagenes").select("correctivo_id, ruta"),
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

  const piezasPorCorrectivo = new Map<string, { descripcion: string; cantidad: number }[]>();
  for (const p of piezasData ?? []) {
    const lista = piezasPorCorrectivo.get(p.correctivo_id as string) ?? [];
    lista.push({ descripcion: p.descripcion as string, cantidad: p.cantidad as number });
    piezasPorCorrectivo.set(p.correctivo_id as string, lista);
  }
  const rutasPorCorrectivo = new Map<string, string[]>();
  for (const i of imagenesData ?? []) {
    const lista = rutasPorCorrectivo.get(i.correctivo_id as string) ?? [];
    lista.push(i.ruta as string);
    rutasPorCorrectivo.set(i.correctivo_id as string, lista);
  }

  // URLs firmadas para todas las imágenes de todos los correctivos de una
  // sola vez (bucket privado, nunca un link público).
  const todasLasRutas = (imagenesData ?? []).map((i) => i.ruta as string);
  const urlsFirmadas = new Map<string, string>();
  if (todasLasRutas.length > 0) {
    const { data: firmadas } = await supabase.storage
      .from(BUCKET_IMAGENES_CORRECTIVO)
      .createSignedUrls(todasLasRutas, DURACION_URL_FIRMADA_SEG);
    for (const f of firmadas ?? []) {
      if (f.signedUrl) urlsFirmadas.set(f.path ?? "", f.signedUrl);
    }
  }

  const correctivos: CorrectivoFila[] = (correctivosData ?? []).map((c) => ({
    id: c.id as string,
    fecha: c.fecha as string,
    droneNombre: (c.drones as unknown as { nombre: string } | null)?.nombre ?? "—",
    motivo: c.motivo as string,
    piezas: (piezasPorCorrectivo.get(c.id as string) ?? [])
      .map((p) => `${p.descripcion} (x${p.cantidad})`)
      .join(", "),
    imagenUrls: (rutasPorCorrectivo.get(c.id as string) ?? [])
      .map((ruta) => urlsFirmadas.get(ruta))
      .filter((url): url is string => Boolean(url)),
  }));

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
        <TablaPreventivo estado={estado} puedeEliminar={puedeEliminar} />
      </div>

      <div className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-green-700/80 dark:text-green-300/80">
          Correctivo — historial
        </h2>
        <TablaCorrectivo correctivos={correctivos} puedeEliminar={puedeEliminar} />
      </div>
    </div>
  );
}
