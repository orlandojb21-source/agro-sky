import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { InformeCampoForm } from "@/components/forms/InformeCampoForm";

const BUCKET_FIRMAS = "informes-campo-firmas";
const DURACION_URL_FIRMADA_SEG = 3600;

export default async function EditarInformeCampoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const supabase = await createClient();
  const [{ data: informe }, { data: parcelasData }, { data: productosData }, { data: colaboradoresData }] =
    await Promise.all([
      supabase.from("informes_campo").select("*").eq("id", id).maybeSingle(),
      supabase.from("informe_campo_parcelas").select("numero_parcela, hectareas").eq("informe_id", id).order("numero_parcela"),
      supabase.from("informe_campo_productos").select("producto_activo, lts_por_hectarea").eq("informe_id", id),
      supabase.from("colaboradores").select("nombre").eq("tipo", "campo").order("nombre"),
    ]);

  if (!informe) notFound();

  let colaboradoresCampo = (colaboradoresData ?? []).map((c) => c.nombre as string);
  // Si el operador o algún ayudante ya guardado se eliminó de la lista
  // administrable, se agrega igual como opción para no cambiar la
  // selección sin querer al abrir el formulario.
  const ayudantes = (informe.ayudantes ?? []) as string[];
  for (const nombre of [informe.operador as string, ...ayudantes]) {
    if (nombre && !colaboradoresCampo.includes(nombre)) {
      colaboradoresCampo = [nombre, ...colaboradoresCampo];
    }
  }

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

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-green-900 dark:text-green-50">
        Editar informe de campo
      </h1>
      <InformeCampoForm
        fechaHoy={informe.fecha as string}
        colaboradoresCampo={colaboradoresCampo}
        valoresIniciales={{
          id: informe.id as string,
          cliente: informe.cliente as string,
          fecha: informe.fecha as string,
          finca: informe.finca as string,
          horaInicio: informe.hora_inicio as string,
          horaFin: informe.hora_fin as string,
          meteorologia: informe.meteorologia as string,
          modeloDrone: informe.modelo_drone as string,
          dosisPorHectarea: Number(informe.dosis_por_hectarea),
          operador: informe.operador as string,
          ayudantes,
          firmaAgroRuta: informe.firma_agro_ruta as string | null,
          nombreFirmaAgro: informe.nombre_firma_agro as string | null,
          firmaAgroUrl,
          firmaClienteRuta: informe.firma_cliente_ruta as string | null,
          nombreFirmaCliente: informe.nombre_firma_cliente as string | null,
          firmaClienteUrl,
          tipoProyecto: informe.tipo_proyecto as "ingenio_santa_rosa" | "particular" | null,
          parcelas: (parcelasData ?? []).map((p) => ({
            numeroParcela: p.numero_parcela as string,
            hectareas: Number(p.hectareas),
          })),
          productos: (productosData ?? []).map((p) => ({
            productoActivo: p.producto_activo as string,
            ltsPorHectarea: Number(p.lts_por_hectarea),
          })),
        }}
      />
    </div>
  );
}
