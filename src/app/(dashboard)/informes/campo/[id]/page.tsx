import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LinkButton } from "@/components/ui/Button";
import { DeleteButton } from "@/components/ui/DeleteButton";
import { BotonExportarInformeCampo } from "@/components/forms/BotonExportarInformeCampo";
import { eliminarInformeCampoAction } from "@/lib/actions/informesCampo";
import { formatDateOnly } from "@/lib/format";
import { textoEquipoDeCampo } from "@/lib/proyectoGastos";
import type { InformeCampoExportable } from "@/lib/exportar";

const BUCKET_FIRMAS = "informes-campo-firmas";
const DURACION_URL_FIRMADA_SEG = 3600;

export default async function DetalleInformeCampoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const supabase = await createClient();
  const [{ data: informe }, { data: parcelasData }, { data: productosData }] = await Promise.all([
    supabase.from("informes_campo").select("*").eq("id", id).maybeSingle(),
    supabase.from("informe_campo_parcelas").select("id, numero_parcela, hectareas").eq("informe_id", id).order("numero_parcela"),
    supabase.from("informe_campo_productos").select("id, producto_activo, lts_por_hectarea").eq("informe_id", id),
  ]);

  if (!informe) notFound();

  const parcelas = (parcelasData ?? []).map((p) => ({
    id: p.id as string,
    numeroParcela: p.numero_parcela as string,
    hectareas: Number(p.hectareas),
  }));
  const productos = (productosData ?? []).map((p) => ({
    id: p.id as string,
    productoActivo: p.producto_activo as string,
    ltsPorHectarea: Number(p.lts_por_hectarea),
  }));
  const totalHectareas = parcelas.reduce((s, p) => s + p.hectareas, 0);

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

  const ayudantes = (informe.ayudantes ?? []) as string[];

  const informeExportable: InformeCampoExportable = {
    cliente: informe.cliente as string,
    fecha: informe.fecha as string,
    finca: informe.finca as string,
    horaInicio: informe.hora_inicio as string,
    horaFin: informe.hora_fin as string,
    meteorologia: informe.meteorologia as string,
    modeloDrone: informe.modelo_drone as string,
    dosisPorHectarea: Number(informe.dosis_por_hectarea),
    tipoProyecto: informe.tipo_proyecto as "ingenio_santa_rosa" | "particular" | null,
    operador: informe.operador as string,
    ayudantes,
    nombreFirmaAgro: informe.nombre_firma_agro as string | null,
    firmaAgroUrl,
    nombreFirmaCliente: informe.nombre_firma_cliente as string | null,
    firmaClienteUrl,
    parcelas: parcelas.map((p) => ({ numeroParcela: p.numeroParcela, hectareas: p.hectareas })),
    productos: productos.map((p) => ({ productoActivo: p.productoActivo, ltsPorHectarea: p.ltsPorHectarea })),
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-green-900 dark:text-green-50">
            {informe.cliente as string}
          </h1>
          <p className="mt-1 text-sm text-green-700/70 dark:text-green-200/70">
            {informe.finca as string} — {formatDateOnly(informe.fecha as string)}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <BotonExportarInformeCampo informe={informeExportable} />
          <LinkButton href={`/informes/campo/${id}/editar`} variant="secondary">
            Editar
          </LinkButton>
          <LinkButton href="/informes/campo" variant="secondary">
            Volver
          </LinkButton>
        </div>
      </div>

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
        <div>
          <p className="text-xs uppercase tracking-wide text-green-700/70 dark:text-green-300/70">Hora</p>
          <p className="text-green-900 dark:text-green-50">
            {(informe.hora_inicio as string).slice(0, 5)} a {(informe.hora_fin as string).slice(0, 5)}
          </p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-green-700/70 dark:text-green-300/70">
            Meteorología
          </p>
          <p className="text-green-900 dark:text-green-50">{informe.meteorologia as string}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-green-700/70 dark:text-green-300/70">
            Modelo de Drone
          </p>
          <p className="text-green-900 dark:text-green-50">{informe.modelo_drone as string}</p>
        </div>
        <div className="col-span-2 sm:col-span-4">
          <p className="text-xs uppercase tracking-wide text-green-700/70 dark:text-green-300/70">
            Equipo de Campo
          </p>
          <p className="text-green-900 dark:text-green-50">
            {textoEquipoDeCampo(informe.operador as string, ayudantes)}
          </p>
        </div>
      </div>

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

      <div>
        <DeleteButton
          action={eliminarInformeCampoAction.bind(null, id)}
          confirmMessage="¿Eliminar este informe? Esta acción no se puede deshacer."
        />
      </div>
    </div>
  );
}
