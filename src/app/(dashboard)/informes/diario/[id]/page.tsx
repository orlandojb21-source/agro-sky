import { notFound } from "next/navigation";
import Link from "next/link";
import { requirePerfil } from "@/lib/session";
import { canWrite } from "@/lib/roles";
import { createClient } from "@/lib/supabase/server";
import { LinkButton } from "@/components/ui/Button";
import { DeleteButton } from "@/components/ui/DeleteButton";
import { BotonExportarInformeDiario } from "@/components/forms/BotonExportarInformeDiario";
import { eliminarInformeDiarioAction } from "@/lib/actions/informesDiarios";
import { formatDateOnly } from "@/lib/format";
import type { InformeCampoExportable, InformeDiarioExportable } from "@/lib/exportar";

const BUCKET_FIRMAS = "informes-campo-firmas";
const BUCKET_CAPTURAS = "informes-diarios-capturas";
const DURACION_URL_FIRMADA_SEG = 3600;

export default async function DetalleInformeDiarioPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const perfil = await requirePerfil();
  const puedeEscribir = canWrite(perfil.rol, "informes");

  const supabase = await createClient();
  const { data: informe } = await supabase
    .from("informes_diarios")
    .select("*, informes_campo ( * )")
    .eq("id", id)
    .maybeSingle();

  if (!informe) notFound();

  const informeCampoRow = informe.informes_campo as Record<string, unknown>;
  const informeCampoId = informeCampoRow.id as string;

  const [{ data: parcelasData }, { data: productosData }] = await Promise.all([
    supabase
      .from("informe_campo_parcelas")
      .select("id, numero_parcela, hectareas")
      .eq("informe_id", informeCampoId)
      .order("numero_parcela"),
    supabase
      .from("informe_campo_productos")
      .select("id, producto_activo, lts_por_hectarea")
      .eq("informe_id", informeCampoId),
  ]);

  let firmaAgroUrl: string | null = null;
  if (informeCampoRow.firma_agro_ruta) {
    const { data } = await supabase.storage
      .from(BUCKET_FIRMAS)
      .createSignedUrl(informeCampoRow.firma_agro_ruta as string, DURACION_URL_FIRMADA_SEG);
    firmaAgroUrl = data?.signedUrl ?? null;
  }
  let firmaClienteUrl: string | null = null;
  if (informeCampoRow.firma_cliente_ruta) {
    const { data } = await supabase.storage
      .from(BUCKET_FIRMAS)
      .createSignedUrl(informeCampoRow.firma_cliente_ruta as string, DURACION_URL_FIRMADA_SEG);
    firmaClienteUrl = data?.signedUrl ?? null;
  }

  let imagenControlUrl: string | null = null;
  if (informe.imagen_control_ruta) {
    const { data } = await supabase.storage
      .from(BUCKET_CAPTURAS)
      .createSignedUrl(informe.imagen_control_ruta as string, DURACION_URL_FIRMADA_SEG);
    imagenControlUrl = data?.signedUrl ?? null;
  }

  const informeCampoExportable: InformeCampoExportable = {
    cliente: informeCampoRow.cliente as string,
    fecha: informeCampoRow.fecha as string,
    finca: informeCampoRow.finca as string,
    horaInicio: informeCampoRow.hora_inicio as string,
    horaFin: informeCampoRow.hora_fin as string,
    meteorologia: informeCampoRow.meteorologia as string,
    tipoAplicacion: informeCampoRow.tipo_aplicacion as "liquido" | "granulado" | null,
    modeloDrone: informeCampoRow.modelo_drone as string,
    dosisPorHectarea: informeCampoRow.dosis_por_hectarea as string,
    tipoProyecto: informeCampoRow.tipo_proyecto as "ingenio_santa_rosa" | "particular" | null,
    operador: informeCampoRow.operador as string,
    ayudantes: (informeCampoRow.ayudantes ?? []) as string[],
    nombreFirmaAgro: informeCampoRow.nombre_firma_agro as string | null,
    firmaAgroUrl,
    nombreFirmaCliente: informeCampoRow.nombre_firma_cliente as string | null,
    firmaClienteUrl,
    parcelas: (parcelasData ?? []).map((p) => ({
      numeroParcela: p.numero_parcela as string,
      hectareas: Number(p.hectareas),
    })),
    productos: (productosData ?? []).map((p) => ({
      productoActivo: p.producto_activo as string,
      ltsPorHectarea: Number(p.lts_por_hectarea),
    })),
    // La copia del Informe de Campo embebida aquí solo dibuja su cuerpo
    // (dibujarCuerpoInformeCampo, en lib/exportar.ts) -- esa función nunca
    // lee imagenUrls, así que no vale la pena generar URLs firmadas que
    // nunca se usarían.
    imagenUrls: [],
  };

  const informeExportable: InformeDiarioExportable = {
    cliente: informe.cliente as string,
    fecha: informe.fecha as string,
    hectareasAplicadas: Number(informe.hectareas_aplicadas),
    tipoAplicacion: informe.tipo_aplicacion as string,
    dosis: informe.dosis as string,
    boquillas: informe.boquillas as string,
    alturaVuelo: informe.altura_vuelo as string,
    anchoPases: informe.ancho_pases as string,
    velocidad: informe.velocidad as string,
    nota: informe.nota as string | null,
    imagenControlUrl,
    informeCampo: informeCampoExportable,
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-green-900 dark:text-green-50">
            {informe.cliente as string}
          </h1>
          <p className="mt-1 text-sm text-green-700/70 dark:text-green-200/70">
            {formatDateOnly(informe.fecha as string)} — Operador: {informeCampoRow.operador as string}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <BotonExportarInformeDiario informe={informeExportable} />
          {puedeEscribir && (
            <LinkButton href={`/informes/diario/${id}/editar`} variant="secondary">
              Editar
            </LinkButton>
          )}
          <LinkButton href="/informes/diario" variant="secondary">
            Volver
          </LinkButton>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 rounded-xl border border-green-100 bg-white p-6 shadow-sm sm:grid-cols-4 dark:border-green-900/40 dark:bg-green-950/10">
        <div>
          <p className="text-xs uppercase tracking-wide text-green-700/70 dark:text-green-300/70">
            Hectáreas Aplicadas
          </p>
          <p className="text-green-900 dark:text-green-50">{Number(informe.hectareas_aplicadas)} ha</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-green-700/70 dark:text-green-300/70">
            Tipo de Aplicación
          </p>
          <p className="text-green-900 dark:text-green-50">{informe.tipo_aplicacion as string}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-green-700/70 dark:text-green-300/70">Dosis</p>
          <p className="text-green-900 dark:text-green-50">{informe.dosis as string}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-green-700/70 dark:text-green-300/70">
            Boquillas
          </p>
          <p className="text-green-900 dark:text-green-50">{informe.boquillas as string}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-green-700/70 dark:text-green-300/70">
            Altura de Vuelo
          </p>
          <p className="text-green-900 dark:text-green-50">{informe.altura_vuelo as string}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-green-700/70 dark:text-green-300/70">
            Ancho de Pases
          </p>
          <p className="text-green-900 dark:text-green-50">{informe.ancho_pases as string}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-green-700/70 dark:text-green-300/70">
            Velocidad
          </p>
          <p className="text-green-900 dark:text-green-50">{informe.velocidad as string}</p>
        </div>
        {informe.nota ? (
          <div className="col-span-2 sm:col-span-4">
            <p className="text-xs uppercase tracking-wide text-green-700/70 dark:text-green-300/70">
              Nota
            </p>
            <p className="text-green-900 dark:text-green-50">{informe.nota as string}</p>
          </div>
        ) : null}
      </div>

      <div className="rounded-xl border border-green-100 bg-white p-6 shadow-sm dark:border-green-900/40 dark:bg-green-950/10">
        <p className="text-xs uppercase tracking-wide text-green-700/70 dark:text-green-300/70">
          Informe de Campo relacionado
        </p>
        <p className="mt-1 text-green-900 dark:text-green-50">
          {informeCampoRow.cliente as string} — {informeCampoRow.finca as string} —{" "}
          {formatDateOnly(informeCampoRow.fecha as string)}
        </p>
        <Link
          href={`/informes/campo/${informeCampoId}`}
          className="mt-2 inline-block text-sm text-green-700 hover:underline dark:text-green-300"
        >
          Ver Informe de Campo completo
        </Link>
      </div>

      {imagenControlUrl && (
        <div className="rounded-xl border border-green-100 bg-white p-6 shadow-sm dark:border-green-900/40 dark:bg-green-950/10">
          <p className="mb-2 text-xs uppercase tracking-wide text-green-700/70 dark:text-green-300/70">
            Captura del control del drone
          </p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imagenControlUrl}
            alt="Captura del control del drone"
            className="max-h-[400px] w-auto rounded-lg border border-green-200 object-contain dark:border-green-800"
          />
        </div>
      )}

      {puedeEscribir && (
        <div>
          <DeleteButton
            action={eliminarInformeDiarioAction.bind(null, id)}
            confirmMessage="¿Eliminar este informe diario? Esta acción no se puede deshacer."
          />
        </div>
      )}
    </div>
  );
}
