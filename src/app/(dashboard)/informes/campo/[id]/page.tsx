import { notFound } from "next/navigation";
import { requirePerfil } from "@/lib/session";
import { canWrite } from "@/lib/roles";
import { createClient } from "@/lib/supabase/server";
import { LinkButton } from "@/components/ui/Button";
import { DeleteButton } from "@/components/ui/DeleteButton";
import { BotonExportarInformeCampo } from "@/components/forms/BotonExportarInformeCampo";
import { eliminarInformeCampoAction } from "@/lib/actions/informesCampo";
import { formatDateOnly } from "@/lib/format";
import { textoEquipoDeCampo } from "@/lib/proyectoGastos";
import type { InformeCampoExportable } from "@/lib/exportar";

const BUCKET_FIRMAS = "informes-campo-firmas";
const BUCKET_IMAGENES = "informes-campo-imagenes";
const DURACION_URL_FIRMADA_SEG = 3600;

type DiaTrabajo = {
  numero: number;
  fecha: string;
  horaInicio: string;
  horaFin: string;
  jornada: "completo" | "medio";
  operador: string;
  ayudantes: string[];
  parcelas: { id: string; numeroParcela: string; hectareas: number }[];
};

export default async function DetalleInformeCampoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const perfil = await requirePerfil();
  const puedeEditar = canWrite(perfil.rol, "informes") && perfil.rol !== "campo";
  const puedeCrear = canWrite(perfil.rol, "informes");

  const supabase = await createClient();
  const [{ data: informe }, { data: parcelasData }, { data: diasData }, { data: productosData }, { data: imagenesData }] =
    await Promise.all([
      supabase.from("informes_campo").select("*").eq("id", id).maybeSingle(),
      supabase
        .from("informe_campo_parcelas")
        .select("id, dia_id, numero_parcela, hectareas")
        .eq("informe_id", id)
        .order("numero_parcela"),
      supabase
        .from("informe_campo_dias")
        .select("id, fecha, hora_inicio, hora_fin, jornada, operador, ayudantes")
        .eq("informe_id", id)
        .order("fecha")
        .order("creado_en"),
      supabase.from("informe_campo_productos").select("id, producto_activo, lts_por_hectarea").eq("informe_id", id),
      supabase.from("informe_campo_imagenes").select("id, ruta").eq("informe_id", id).order("creado_en"),
    ]);

  if (!informe) notFound();

  const parcelas = (parcelasData ?? []).map((p) => ({
    id: p.id as string,
    diaId: p.dia_id as string | null,
    numeroParcela: p.numero_parcela as string,
    hectareas: Number(p.hectareas),
  }));
  const productos = (productosData ?? []).map((p) => ({
    id: p.id as string,
    productoActivo: p.producto_activo as string,
    ltsPorHectarea: Number(p.lts_por_hectarea),
  }));
  const totalHectareas = parcelas.reduce((s, p) => s + p.hectareas, 0);

  const estado = informe.estado as "abierto" | "cerrado";
  const esParticular = informe.tipo_proyecto === "particular";

  // Día 1 = el propio encabezado del informe (fecha/operador/ayudantes de
  // siempre) -- los días 2+ vienen de informe_campo_dias (ver migración
  // 0085). Cada parcela pertenece a un día por su "dia_id" (null = día 1).
  const dias: DiaTrabajo[] = [
    {
      numero: 1,
      fecha: informe.fecha as string,
      horaInicio: informe.hora_inicio as string,
      horaFin: informe.hora_fin as string,
      jornada: informe.jornada as "completo" | "medio",
      operador: informe.operador as string,
      ayudantes: (informe.ayudantes ?? []) as string[],
      parcelas: parcelas
        .filter((p) => p.diaId === null)
        .map((p) => ({ id: p.id, numeroParcela: p.numeroParcela, hectareas: p.hectareas })),
    },
    ...(diasData ?? []).map((d, i) => ({
      numero: i + 2,
      fecha: d.fecha as string,
      horaInicio: d.hora_inicio as string,
      horaFin: d.hora_fin as string,
      jornada: d.jornada as "completo" | "medio",
      operador: d.operador as string,
      ayudantes: (d.ayudantes ?? []) as string[],
      parcelas: parcelas
        .filter((p) => p.diaId === (d.id as string))
        .map((p) => ({ id: p.id, numeroParcela: p.numeroParcela, hectareas: p.hectareas })),
    })),
  ];
  // Solo se muestra el desglose por día cuando hay más de 1 (o el informe
  // sigue Abierto, esperando el próximo) -- un informe de un solo día
  // (Ingenio Santa Rosa siempre, o un Particular cerrado el mismo día,
  // que es la mayoría) se ve exactamente igual que siempre, sin este
  // bloque extra.
  const mostrarDesgloseDias = esParticular && (dias.length > 1 || estado === "abierto");

  let firmaAgroUrl: string | null = null;
  if (informe.firma_agro_ruta) {
    const { data } = await supabase.storage
      .from(BUCKET_FIRMAS)
      .createSignedUrl(informe.firma_agro_ruta, DURACION_URL_FIRMADA_SEG);
    firmaAgroUrl = data?.signedUrl ?? null;
  }
  let firmaClienteUrl: string | null = null;
  if (informe.firma_cliente_ruta) {
    const { data } = await supabase.storage
      .from(BUCKET_FIRMAS)
      .createSignedUrl(informe.firma_cliente_ruta, DURACION_URL_FIRMADA_SEG);
    firmaClienteUrl = data?.signedUrl ?? null;
  }
  const imagenes = (imagenesData ?? []).map((img) => ({ id: img.id as string, ruta: img.ruta as string }));
  const imagenUrls = (
    await Promise.all(
      imagenes.map(async (img) => {
        const { data } = await supabase.storage
          .from(BUCKET_IMAGENES)
          .createSignedUrl(img.ruta, DURACION_URL_FIRMADA_SEG);
        return data?.signedUrl ?? null;
      }),
    )
  ).filter((url): url is string => Boolean(url));

  const ayudantes = (informe.ayudantes ?? []) as string[];

  // La exportación (PDF/Excel) suma TODAS las parcelas de TODOS los días
  // -- el total de hectáreas siempre sale correcto. El desglose día por
  // día en sí (quién trabajó qué día) solo se ve en esta pantalla por
  // ahora, no en el PDF -- se puede agregar después si hace falta.
  const informeExportable: InformeCampoExportable = {
    cliente: informe.cliente as string,
    fecha: informe.fecha as string,
    finca: informe.finca as string,
    horaInicio: informe.hora_inicio as string,
    horaFin: informe.hora_fin as string,
    meteorologia: informe.meteorologia as string,
    tipoAplicacion: informe.tipo_aplicacion as "liquido" | "granulado" | null,
    modeloDrone: informe.modelo_drone as string,
    dosisPorHectarea: informe.dosis_por_hectarea as string,
    tipoProyecto: informe.tipo_proyecto as "ingenio_santa_rosa" | "particular" | null,
    jornada: informe.jornada as "completo" | "medio",
    operador: informe.operador as string,
    ayudantes,
    nombreFirmaAgro: informe.nombre_firma_agro as string | null,
    firmaAgroUrl,
    nombreFirmaCliente: informe.nombre_firma_cliente as string | null,
    firmaClienteUrl,
    parcelas: parcelas.map((p) => ({ numeroParcela: p.numeroParcela, hectareas: p.hectareas })),
    productos: productos.map((p) => ({ productoActivo: p.productoActivo, ltsPorHectarea: p.ltsPorHectarea })),
    imagenUrls,
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold text-green-900 dark:text-green-50">
              {informe.cliente as string}
            </h1>
            {esParticular && (
              <span
                className={
                  estado === "abierto"
                    ? "rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-900/40 dark:text-amber-300"
                    : "rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800 dark:bg-green-900/40 dark:text-green-300"
                }
              >
                {estado === "abierto" ? "Abierto" : "Cerrado"}
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-green-700/70 dark:text-green-200/70">
            {informe.finca as string} — {formatDateOnly(informe.fecha as string)}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <BotonExportarInformeCampo informe={informeExportable} />
          {puedeEditar && estado === "cerrado" && (
            <LinkButton href={`/informes/campo/${id}/editar`} variant="secondary">
              Editar
            </LinkButton>
          )}
          <LinkButton href="/informes/campo" variant="secondary">
            Volver
          </LinkButton>
        </div>
      </div>

      {estado === "abierto" && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 shadow-sm dark:border-amber-900/40 dark:bg-amber-950/20">
          <p className="text-sm text-amber-800 dark:text-amber-300">
            Este informe está <strong>Abierto</strong> -- se le pueden seguir agregando días de
            trabajo. Todavía no tiene firmas.
          </p>
          <div className="flex flex-wrap gap-2">
            {puedeCrear && (
              <LinkButton href={`/informes/campo/${id}/dia/nuevo`}>+ Agregar día</LinkButton>
            )}
            {puedeEditar && (
              <LinkButton href={`/informes/campo/${id}/cerrar`} variant="secondary">
                Cerrar informe
              </LinkButton>
            )}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 rounded-xl border border-green-100 bg-white p-6 shadow-sm sm:grid-cols-4 dark:border-green-900/40 dark:bg-green-950/10">
        <div>
          <p className="text-xs uppercase tracking-wide text-green-700/70 dark:text-green-300/70">
            Tipo de proyecto
          </p>
          <p className="text-green-900 dark:text-green-50">
            {informe.tipo_proyecto === "ingenio_santa_rosa"
              ? "Ingenio Santa Rosa"
              : informe.tipo_proyecto === "particular"
                ? "Trabajo Particular"
                : "—"}
          </p>
        </div>
        {!mostrarDesgloseDias && (
          <>
            <div>
              <p className="text-xs uppercase tracking-wide text-green-700/70 dark:text-green-300/70">Hora</p>
              <p className="text-green-900 dark:text-green-50">
                {(informe.hora_inicio as string).slice(0, 5)} a {(informe.hora_fin as string).slice(0, 5)}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-green-700/70 dark:text-green-300/70">Jornada</p>
              <p className="text-green-900 dark:text-green-50">
                {informe.jornada === "medio" ? "Medio día" : "Día completo"}
              </p>
            </div>
          </>
        )}
        <div>
          <p className="text-xs uppercase tracking-wide text-green-700/70 dark:text-green-300/70">
            Meteorología
          </p>
          <p className="text-green-900 dark:text-green-50">{informe.meteorologia as string}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-green-700/70 dark:text-green-300/70">
            Tipo de Aplicación
          </p>
          <p className="text-green-900 dark:text-green-50">
            {informe.tipo_aplicacion === "liquido"
              ? "Líquido"
              : informe.tipo_aplicacion === "granulado"
                ? "Granulado"
                : "—"}
          </p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-green-700/70 dark:text-green-300/70">
            Modelo de Drone
          </p>
          <p className="text-green-900 dark:text-green-50">{informe.modelo_drone as string}</p>
        </div>
        {!mostrarDesgloseDias && (
          <div className="col-span-2 sm:col-span-4">
            <p className="text-xs uppercase tracking-wide text-green-700/70 dark:text-green-300/70">
              Equipo de Campo
            </p>
            <p className="text-green-900 dark:text-green-50">
              {textoEquipoDeCampo(informe.operador as string, ayudantes)}
            </p>
          </div>
        )}
      </div>

      {mostrarDesgloseDias ? (
        <div className="flex flex-col gap-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-green-700/80 dark:text-green-300/80">
            Días trabajados ({dias.length})
          </h2>
          {dias.map((dia) => {
            const subtotal = dia.parcelas.reduce((s, p) => s + p.hectareas, 0);
            return (
              <div
                key={dia.numero}
                className="overflow-hidden rounded-xl border border-green-100 bg-white shadow-sm dark:border-green-900/40 dark:bg-green-950/10"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-green-100 bg-green-50 px-4 py-3 dark:border-green-900/40 dark:bg-green-950/30">
                  <p className="text-sm font-semibold text-green-900 dark:text-green-50">
                    Día {dia.numero} — {formatDateOnly(dia.fecha)}
                  </p>
                  <p className="text-xs text-green-700/80 dark:text-green-300/80">
                    {(dia.jornada === "medio" ? "Medio día" : "Día completo")} · {dia.horaInicio.slice(0, 5)} a{" "}
                    {dia.horaFin.slice(0, 5)} · {textoEquipoDeCampo(dia.operador, dia.ayudantes)}
                  </p>
                </div>
                {dia.parcelas.length === 0 ? (
                  <p className="px-4 py-4 text-sm text-green-700/70 dark:text-green-200/70">
                    Sin parcelas cargadas.
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[360px] text-left text-sm">
                      <thead>
                        <tr className="border-b border-green-100 text-xs uppercase tracking-wide text-green-700 dark:border-green-900/40 dark:text-green-300">
                          <th className="px-3 py-2 font-medium">Parcela #</th>
                          <th className="px-3 py-2 font-medium">Hectáreas</th>
                        </tr>
                      </thead>
                      <tbody>
                        {dia.parcelas.map((p) => (
                          <tr key={p.id} className="border-b border-green-50 last:border-0 dark:border-green-900/30">
                            <td className="px-3 py-3 text-green-900 dark:text-green-50">{p.numeroParcela}</td>
                            <td className="px-3 py-3 text-green-800/80 dark:text-green-200/80">{p.hectareas}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="border-t border-green-200/60 font-semibold dark:border-green-800/60">
                          <td className="px-3 py-2 text-green-900 dark:text-green-50">subtotal</td>
                          <td className="px-3 py-2 text-green-700 dark:text-green-400">{subtotal}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
          <div className="inline-flex items-center gap-2 self-start rounded-lg border border-red-200 bg-red-50 px-4 py-2 dark:border-red-900/40 dark:bg-red-950/20">
            <span className="text-xs font-medium uppercase tracking-wide text-red-700 dark:text-red-400">
              Total hectáreas (todos los días)
            </span>
            <span className="text-lg font-semibold text-red-900 dark:text-red-100">{totalHectareas}</span>
          </div>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-green-100 bg-white shadow-sm dark:border-green-900/40 dark:bg-green-950/10">
          <h2 className="border-b border-green-100 bg-green-50 px-4 py-3 text-sm font-semibold text-green-900 dark:border-green-900/40 dark:bg-green-950/30 dark:text-green-50">
            Parcelas
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[360px] text-left text-sm">
              <thead>
                <tr className="border-b border-green-100 text-xs uppercase tracking-wide text-green-700 dark:border-green-900/40 dark:text-green-300">
                  <th className="px-3 py-2 font-medium">Parcela #</th>
                  <th className="px-3 py-2 font-medium">Hectáreas</th>
                </tr>
              </thead>
              <tbody>
                {parcelas.map((p) => (
                  <tr key={p.id} className="border-b border-green-50 last:border-0 dark:border-green-900/30">
                    <td className="px-3 py-3 text-green-900 dark:text-green-50">{p.numeroParcela}</td>
                    <td className="px-3 py-3 text-green-800/80 dark:text-green-200/80">{p.hectareas}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-green-200/60 font-semibold dark:border-green-800/60">
                  <td className="px-3 py-2 text-green-900 dark:text-green-50">total</td>
                  <td className="px-3 py-2 text-green-700 dark:text-green-400">{totalHectareas}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {productos.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-green-100 bg-white shadow-sm dark:border-green-900/40 dark:bg-green-950/10">
          <h2 className="border-b border-green-100 bg-green-50 px-4 py-3 text-sm font-semibold text-green-900 dark:border-green-900/40 dark:bg-green-950/30 dark:text-green-50">
            Productos
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[420px] text-left text-sm">
              <thead>
                <tr className="border-b border-green-100 text-xs uppercase tracking-wide text-green-700 dark:border-green-900/40 dark:text-green-300">
                  <th className="px-3 py-2 font-medium">Producto activo</th>
                  <th className="px-3 py-2 font-medium">Lts por Hectárea</th>
                </tr>
              </thead>
              <tbody>
                {productos.map((p) => (
                  <tr key={p.id} className="border-b border-green-50 last:border-0 dark:border-green-900/30">
                    <td className="px-3 py-3 text-green-900 dark:text-green-50">{p.productoActivo}</td>
                    <td className="px-3 py-3 text-green-800/80 dark:text-green-200/80">{p.ltsPorHectarea}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {estado === "cerrado" && (
        <div className="grid grid-cols-1 gap-6 rounded-xl border border-green-100 bg-white p-6 shadow-sm sm:grid-cols-2 dark:border-green-900/40 dark:bg-green-950/10">
          <div>
            <p className="text-xs uppercase tracking-wide text-green-700/70 dark:text-green-300/70">
              Encargado Agro Sky Corp
            </p>
            {firmaAgroUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={firmaAgroUrl}
                alt="Firma Encargado Agro Sky Corp"
                className="mt-2 h-[100px] rounded-lg border border-green-200 bg-white object-contain dark:border-green-800"
              />
            ) : (
              <p className="mt-2 text-sm text-green-700/60 dark:text-green-300/60">Sin firma</p>
            )}
            <p className="mt-1 text-sm text-green-900 dark:text-green-50">
              {(informe.nombre_firma_agro as string | null) ?? "—"}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-green-700/70 dark:text-green-300/70">
              Encargado por parte del cliente
            </p>
            {firmaClienteUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={firmaClienteUrl}
                alt="Firma Encargado por parte del cliente"
                className="mt-2 h-[100px] rounded-lg border border-green-200 bg-white object-contain dark:border-green-800"
              />
            ) : (
              <p className="mt-2 text-sm text-green-700/60 dark:text-green-300/60">Sin firma</p>
            )}
            <p className="mt-1 text-sm text-green-900 dark:text-green-50">
              {(informe.nombre_firma_cliente as string | null) ?? "—"}
            </p>
          </div>
        </div>
      )}

      {imagenUrls.length > 0 && (
        <div className="rounded-xl border border-green-100 bg-white p-6 shadow-sm dark:border-green-900/40 dark:bg-green-950/10">
          <p className="mb-2 text-xs uppercase tracking-wide text-green-700/70 dark:text-green-300/70">
            {imagenUrls.length > 1 ? "Imágenes adjuntas" : "Imagen adjunta"}
          </p>
          <div className="flex flex-wrap gap-3">
            {imagenUrls.map((url, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={url}
                src={url}
                alt={`Imagen adjunta ${i + 1}`}
                className="h-40 w-auto rounded-lg border border-green-200 object-contain dark:border-green-800"
              />
            ))}
          </div>
        </div>
      )}

      {puedeEditar && (
        <div>
          <DeleteButton
            action={eliminarInformeCampoAction.bind(null, id)}
            confirmMessage="¿Eliminar este informe? Esta acción no se puede deshacer."
          />
        </div>
      )}
    </div>
  );
}
