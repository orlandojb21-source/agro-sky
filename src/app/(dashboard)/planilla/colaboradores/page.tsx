import { requireSection } from "@/lib/session";
import { canWrite } from "@/lib/roles";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/PageHeader";
import { LinkButton } from "@/components/ui/Button";
import { ColaboradorForm } from "@/components/forms/ColaboradorForm";
import { ColaboradorFormToggle } from "@/components/forms/ColaboradorFormToggle";
import { ColaboradoresListado } from "@/components/forms/ColaboradoresListado";

const BUCKET_FOTOS = "colaboradores-fotos";
const DURACION_URL_FIRMADA_SEG = 3600;

export default async function ColaboradoresPage() {
  const perfil = await requireSection("planilla");
  const puedeEscribir = canWrite(perfil.rol, "planilla");

  const supabase = await createClient();
  const { data } = await supabase
    .from("colaboradores")
    .select("id, nombre, tipo, salario, aplica_deducciones, foto_ruta")
    .order("nombre");

  const rutasFoto = (data ?? [])
    .map((c) => c.foto_ruta as string | null)
    .filter((ruta): ruta is string => Boolean(ruta));
  const urlsFirmadas = new Map<string, string>();
  if (rutasFoto.length > 0) {
    const { data: firmadas } = await supabase.storage
      .from(BUCKET_FOTOS)
      .createSignedUrls(rutasFoto, DURACION_URL_FIRMADA_SEG);
    for (const f of firmadas ?? []) {
      if (f.signedUrl) urlsFirmadas.set(f.path ?? "", f.signedUrl);
    }
  }

  const colaboradores = (data ?? []).map((c) => ({
    id: c.id as string,
    nombre: c.nombre as string,
    tipo: c.tipo as "fijo" | "campo",
    salario: c.salario === null ? null : Number(c.salario),
    aplicaDeducciones: c.aplica_deducciones as boolean,
    fotoUrl: c.foto_ruta ? (urlsFirmadas.get(c.foto_ruta as string) ?? null) : null,
  }));
  const fijos = colaboradores.filter((c) => c.tipo === "fijo");
  const campo = colaboradores.filter((c) => c.tipo === "campo");

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Colaboradores"
        description="Nombres disponibles para registrar pagos de Planilla."
        action={
          <LinkButton href="/planilla" variant="secondary">
            Volver a Planilla
          </LinkButton>
        }
      />

      {puedeEscribir && (
        <ColaboradorFormToggle>
          <ColaboradorForm />
        </ColaboradorFormToggle>
      )}

      <ColaboradoresListado fijos={fijos} campo={campo} puedeEscribir={puedeEscribir} />
    </div>
  );
}
