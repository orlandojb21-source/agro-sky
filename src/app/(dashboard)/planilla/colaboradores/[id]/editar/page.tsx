import { notFound } from "next/navigation";
import { requireSection } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { ColaboradorForm } from "@/components/forms/ColaboradorForm";

const BUCKET_FOTOS = "colaboradores-fotos";
const DURACION_URL_FIRMADA_SEG = 3600;

export default async function EditarColaboradorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await requireSection("planilla");

  const supabase = await createClient();
  const { data: colaborador } = await supabase
    .from("colaboradores")
    .select("id, nombre, tipo, salario, aplica_deducciones, cedula, correo, telefono, direccion, foto_ruta")
    .eq("id", id)
    .maybeSingle();

  if (!colaborador) notFound();

  let fotoUrl: string | null = null;
  if (colaborador.foto_ruta) {
    const { data } = await supabase.storage
      .from(BUCKET_FOTOS)
      .createSignedUrl(colaborador.foto_ruta, DURACION_URL_FIRMADA_SEG);
    fotoUrl = data?.signedUrl ?? null;
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-green-900 dark:text-green-50">
        Editar colaborador
      </h1>
      <ColaboradorForm
        valoresIniciales={{
          id: colaborador.id as string,
          nombre: colaborador.nombre as string,
          tipo: colaborador.tipo as "fijo" | "campo",
          salario: colaborador.salario === null ? null : Number(colaborador.salario),
          aplicaDeducciones: colaborador.aplica_deducciones as boolean,
          cedula: colaborador.cedula as string | null,
          correo: colaborador.correo as string | null,
          telefono: colaborador.telefono as string | null,
          direccion: colaborador.direccion as string | null,
          fotoRuta: colaborador.foto_ruta as string | null,
          fotoUrl,
        }}
      />
    </div>
  );
}
