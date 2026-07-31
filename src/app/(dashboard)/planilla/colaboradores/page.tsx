import Link from "next/link";
import { requireSection } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/PageHeader";
import { LinkButton } from "@/components/ui/Button";
import { DeleteButton } from "@/components/ui/DeleteButton";
import { ColaboradorForm } from "@/components/forms/ColaboradorForm";
import { eliminarColaboradorAction } from "@/lib/actions/colaboradores";
import { formatMoney } from "@/lib/format";

type ColaboradorFila = {
  id: string;
  nombre: string;
  salario: number | null;
  aplicaDeducciones: boolean;
};

function ListaColaboradores({
  titulo,
  colaboradores,
}: {
  titulo: string;
  colaboradores: ColaboradorFila[];
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
                <div>
                  <span className="font-medium text-green-900 dark:text-green-50">{c.nombre}</span>
                  {c.salario !== null && (
                    <span className="ml-2 text-sm text-green-700/70 dark:text-green-300/70">
                      {formatMoney(c.salario)} quincenal
                      {!c.aplicaDeducciones && " — sin CSS/Seguro Educativo"}
                    </span>
                  )}
                </div>
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
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export default async function ColaboradoresPage() {
  await requireSection("planilla");

  const supabase = await createClient();
  const { data } = await supabase
    .from("colaboradores")
    .select("id, nombre, tipo, salario, aplica_deducciones")
    .order("nombre");

  const colaboradores = (data ?? []).map((c) => ({
    id: c.id as string,
    nombre: c.nombre as string,
    tipo: c.tipo as "fijo" | "campo",
    salario: c.salario === null ? null : Number(c.salario),
    aplicaDeducciones: c.aplica_deducciones as boolean,
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

      <ColaboradorForm />

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <ListaColaboradores titulo="Fijos (salario quincenal)" colaboradores={fijos} />
        <ListaColaboradores titulo="Campo (asistencia diaria, pago quincenal)" colaboradores={campo} />
      </div>
    </div>
  );
}
