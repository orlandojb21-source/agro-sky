import Link from "next/link";
import { notFound } from "next/navigation";
import { requireWrite } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { ClienteForm } from "@/components/forms/ClienteForm";
import { formatDateOnly } from "@/lib/format";

function etiquetaTipo(tipo: "ingenio_santa_rosa" | "particular") {
  return tipo === "ingenio_santa_rosa" ? "Ingenio Santa Rosa" : "Trabajo Particular";
}

function BadgeEstado({ estado }: { estado: "abierto" | "cerrado" }) {
  if (estado === "abierto") {
    return (
      <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800 dark:bg-green-900/40 dark:text-green-300">
        Abierto
      </span>
    );
  }
  return (
    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700 dark:bg-gray-800/60 dark:text-gray-300">
      Cerrado
    </span>
  );
}

export default async function EditarClientePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await requireWrite("ventas");

  const supabase = await createClient();
  const [{ data: cliente }, { data: proyectosData }] = await Promise.all([
    supabase
      .from("clientes")
      .select("id, nombre, cedula, ruc, ruc_dv, telefono, direccion, correo")
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("proyectos")
      .select("id, codigo, nombre, tipo_proyecto, estado, creado_en")
      .eq("cliente_id", id)
      .order("creado_en", { ascending: false }),
  ]);

  if (!cliente) notFound();

  const proyectos = (proyectosData ?? []).map((p) => ({
    id: p.id as string,
    codigo: p.codigo as string,
    nombre: p.nombre as string,
    tipoProyecto: p.tipo_proyecto as "ingenio_santa_rosa" | "particular",
    estado: p.estado as "abierto" | "cerrado",
    creadoEn: p.creado_en as string,
  }));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="mb-6 text-2xl font-semibold text-green-900 dark:text-green-50">
          Editar cliente
        </h1>
        <ClienteForm
          valoresIniciales={{
            id: cliente.id as string,
            nombre: cliente.nombre as string,
            cedula: cliente.cedula as string | null,
            ruc: cliente.ruc as string | null,
            rucDv: cliente.ruc_dv as string | null,
            telefono: cliente.telefono as string | null,
            direccion: cliente.direccion as string | null,
            correo: cliente.correo as string | null,
          }}
        />
      </div>

      <div className="overflow-hidden rounded-xl border border-green-100 bg-white shadow-sm dark:border-green-900/40 dark:bg-green-950/10">
        <h2 className="border-b border-green-100 bg-green-50 px-4 py-3 text-sm font-semibold text-green-900 dark:border-green-900/40 dark:bg-green-950/30 dark:text-green-50">
          Historial de Proyectos
        </h2>
        {proyectos.length === 0 ? (
          <p className="px-4 py-6 text-sm text-green-700/70 dark:text-green-200/70">
            Este cliente todavía no tiene ningún Proyecto registrado.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead>
                <tr className="border-b border-green-100 text-xs uppercase tracking-wide text-green-700 dark:border-green-900/40 dark:text-green-300">
                  <th className="px-4 py-2 font-medium">Código</th>
                  <th className="px-4 py-2 font-medium">Nombre</th>
                  <th className="px-4 py-2 font-medium">Tipo</th>
                  <th className="px-4 py-2 font-medium">Estado</th>
                  <th className="px-4 py-2 font-medium">Creado</th>
                </tr>
              </thead>
              <tbody>
                {proyectos.map((p) => (
                  <tr key={p.id} className="border-b border-green-50 last:border-0 dark:border-green-900/30">
                    <td className="px-4 py-3 font-medium text-green-900 dark:text-green-50">
                      <Link href={`/informes/proyectos/${p.id}/editar`} className="hover:underline">
                        {p.codigo}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-green-800/80 dark:text-green-200/80">{p.nombre}</td>
                    <td className="px-4 py-3 text-green-800/80 dark:text-green-200/80">
                      {etiquetaTipo(p.tipoProyecto)}
                    </td>
                    <td className="px-4 py-3">
                      <BadgeEstado estado={p.estado} />
                    </td>
                    <td className="px-4 py-3 text-green-800/80 dark:text-green-200/80">
                      {formatDateOnly(p.creadoEn)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
