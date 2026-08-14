import { requireSection } from "@/lib/session";
import { canWrite } from "@/lib/roles";
import { createClient } from "@/lib/supabase/server";
import { calcularSaldosPrestamos } from "@/lib/prestamos";
import { PageHeader } from "@/components/ui/PageHeader";
import { LinkButton } from "@/components/ui/Button";
import { ColaboradorFormToggle } from "@/components/forms/ColaboradorFormToggle";
import { PrestamoForm } from "@/components/forms/PrestamoForm";
import { PrestamosTabla, type PrestamoFila } from "@/components/forms/PrestamosTabla";

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

      <PrestamosTabla prestamos={prestamos} puedeEscribir={puedeEscribir} />
    </div>
  );
}
