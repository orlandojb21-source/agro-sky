import Link from "next/link";
import { requireSection } from "@/lib/session";
import { canWrite } from "@/lib/roles";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/PageHeader";
import { LinkButton } from "@/components/ui/Button";
import { DeleteButton } from "@/components/ui/DeleteButton";
import { ColaboradorForm } from "@/components/forms/ColaboradorForm";
import { ColaboradorFormToggle } from "@/components/forms/ColaboradorFormToggle";
import { eliminarColaboradorAction } from "@/lib/actions/colaboradores";

const BUCKET_FOTOS = "colaboradores-fotos";
const DURACION_URL_FIRMADA_SEG = 3600;

type ColaboradorFila = {
  id: string;
  nombre: string;
  salario: number | null;
  aplicaDeducciones: boolean;
  fotoUrl: string | null;
};

function ListaColaboradores({
  titulo,
  colaboradores,
  puedeEscribir,
}: {
  titulo: string;
  colaboradores: ColaboradorFila[];
  puedeEscribir: boolean;
}) {
  return (
    <div className="flex flex-col gap-2">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-green-700/80 dark:text-green-300/80">
        {titulo}
      </h2>
      <div className="overflow-hidden rounded-xl border border-green-100 bg-white shadow-sm dark:border-green-900/40 dark:bg-green-950/10">
        {colaboradores.length === 0 ? (
          <p className="px-6 py-6 text-center text-sm text-green-700/70 dark:text-green-200/70">
            Todavía no hay colaboradores de este tipo.
          </p>
        ) : (
          <ul className="divide-y divide-green-50 dark:divide-green-900/30">
            {colaboradores.map((c) => (
              <li key={c.id} className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-3">
                  {c.fotoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={c.fotoUrl}
                      alt={c.nombre}
                      className="h-9 w-9 rounded-full border border-green-200 object-cover dark:border-green-800"
                    />
                  ) : (
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-green-100 text-xs font-medium text-green-700 dark:bg-green-900/40 dark:text-green-300">
                      {c.nombre.charAt(0).toUpperCase()}
                    </span>
                  )}
                  <span className="font-medium text-green-900 dark:text-green-50">{c.nombre}</span>
                </div>
                {puedeEscribir && (
                  <div className="flex gap-3">
                    <Link
                      href={`/planilla/colaboradores/${c.id}/editar`}
                      className="text-sm text-green-700 hover:underline dark:text-green-300"
                    >
                      Editar
                    </Link>
                    <DeleteButton
                      action={eliminarColaboradorAction.bind(null, c.id)}
                      confirmMessage={`¿Eliminar a ${c.nombre}? Los pagos ya registrados a su nombre no se ven afectados, pero dejará de aparecer para registrar pagos nuevos.`}
                    />
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

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

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <ListaColaboradores
          titulo="Fijos (salario mensual)"
          colaboradores={fijos}
          puedeEscribir={puedeEscribir}
        />
        <ListaColaboradores
          titulo="Campo (asistencia diaria, pago quincenal)"
          colaboradores={campo}
          puedeEscribir={puedeEscribir}
        />
      </div>
    </div>
  );
}
