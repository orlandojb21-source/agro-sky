import Link from "next/link";
import { requireSection } from "@/lib/session";
import { canWrite } from "@/lib/roles";
import { createClient } from "@/lib/supabase/server";
import { calcularSaldosPrestamos } from "@/lib/prestamos";
import { PageHeader } from "@/components/ui/PageHeader";
import { LinkButton } from "@/components/ui/Button";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { DeleteButton } from "@/components/ui/DeleteButton";
import { ColaboradorFormToggle } from "@/components/forms/ColaboradorFormToggle";
import { PrestamoForm } from "@/components/forms/PrestamoForm";
import { eliminarPrestamoAction } from "@/lib/actions/prestamos";
import { formatDateOnly, formatMoney } from "@/lib/format";

type PrestamoFila = {
  id: string;
  colaborador: string;
  fecha: string;
  monto: number;
  cuotaQuincenal: number;
  nota: string | null;
  saldoPendiente: number;
};

export default async function PrestamosPage() {
  const perfil = await requireSection("planilla");
  const puedeEscribir = canWrite(perfil.rol, "planilla");

  const supabase = await createClient();
  const [{ data: prestamosData }, { data: colaboradoresData }] = await Promise.all([
    supabase
      .from("prestamos")
      .select("id, colaborador, fecha, monto, cuota_quincenal, nota")
      .order("fecha", { ascending: false }),
    supabase.from("colaboradores").select("nombre").order("nombre"),
  ]);

  const prestamosBase = (prestamosData ?? []).map((p) => ({
    id: p.id as string,
    colaborador: p.colaborador as string,
    fecha: p.fecha as string,
    monto: Number(p.monto),
    cuotaQuincenal: Number(p.cuota_quincenal),
    nota: p.nota as string | null,
  }));

  const saldos = await calcularSaldosPrestamos(supabase, prestamosBase);

  const prestamos: PrestamoFila[] = prestamosBase.map((p) => ({
    ...p,
    saldoPendiente: saldos.get(p.id) ?? p.monto,
  }));

  const colaboradores = (colaboradoresData ?? []).map((c) => c.nombre as string);

  const columns: Column<PrestamoFila>[] = [
    { header: "Colaborador", render: (p) => p.colaborador },
    { header: "Fecha", render: (p) => formatDateOnly(p.fecha) },
    { header: "Monto prestado", render: (p) => formatMoney(p.monto) },
    { header: "Cuota sugerida", render: (p) => formatMoney(p.cuotaQuincenal) },
    {
      header: "Saldo pendiente",
      render: (p) =>
        p.saldoPendiente <= 0 ? (
          <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800 dark:bg-green-900/40 dark:text-green-300">
            Pagado
          </span>
        ) : (
          <span className="font-medium text-red-700 dark:text-red-400">{formatMoney(p.saldoPendiente)}</span>
        ),
    },
    ...(puedeEscribir
      ? [
          {
            header: "",
            render: (p: PrestamoFila) => (
              <div className="flex gap-3">
                <Link
                  href={`/planilla/prestamos/${p.id}/editar`}
                  className="text-sm text-green-700 hover:underline dark:text-green-300"
                >
                  Editar
                </Link>
                <DeleteButton
                  action={eliminarPrestamoAction.bind(null, p.id)}
                  confirmMessage={`¿Eliminar el préstamo de ${p.colaborador}? Solo se puede si todavía no tiene abonos registrados.`}
                />
              </div>
            ),
          },
        ]
      : []),
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Préstamos"
        description="Préstamos de la empresa a colaboradores, con la cuota sugerida a descontar en cada pago de quincena."
        action={
          <LinkButton href="/planilla" variant="secondary">
            Volver a Planilla
          </LinkButton>
        }
      />

      {puedeEscribir && (
        <ColaboradorFormToggle label="+ Nuevo préstamo">
          <PrestamoForm colaboradores={colaboradores} fechaHoy={new Date().toISOString().slice(0, 10)} />
        </ColaboradorFormToggle>
      )}

      <DataTable rows={prestamos} columns={columns} emptyMessage="Todavía no hay préstamos registrados." />
    </div>
  );
}
