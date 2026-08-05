import { notFound } from "next/navigation";
import { requireWrite } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { AsistenciaForm } from "@/components/forms/AsistenciaForm";

export default async function EditarAsistenciaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await requireWrite("planilla");

  const supabase = await createClient();
  const [{ data: asistencia }, { data: colaboradoresData }] = await Promise.all([
    supabase
      .from("planilla_asistencia")
      .select("id, colaborador, fecha, rol_dia, tipo_trabajo, jornada, descripcion")
      .eq("id", id)
      .maybeSingle(),
    supabase.from("colaboradores").select("nombre").eq("tipo", "campo").order("nombre"),
  ]);

  if (!asistencia) notFound();

  let colaboradores = (colaboradoresData ?? []).map((c) => ({ nombre: c.nombre as string }));

  // Si se edita un registro de un colaborador que ya se eliminó de la
  // lista administrable, se agrega igual como opción para no cambiarle el
  // colaborador sin querer al abrir el formulario.
  if (!colaboradores.some((c) => c.nombre === asistencia.colaborador)) {
    colaboradores = [{ nombre: asistencia.colaborador as string }, ...colaboradores];
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-green-900 dark:text-green-50">
        Editar asistencia
      </h1>
      <AsistenciaForm
        fechaHoy={asistencia.fecha}
        colaboradores={colaboradores}
        valoresIniciales={{
          id: asistencia.id,
          colaborador: asistencia.colaborador,
          fecha: asistencia.fecha,
          rolDia: asistencia.rol_dia as "operador" | "ayudante",
          tipoTrabajo: asistencia.tipo_trabajo as "proyecto" | "oficina",
          jornada: asistencia.jornada as "completo" | "medio" | "proyecto",
          descripcion: asistencia.descripcion,
        }}
      />
    </div>
  );
}
