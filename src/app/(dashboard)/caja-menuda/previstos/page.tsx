import { requireSection } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { esSoporteOJefe } from "@/lib/roles";
import { PageHeader } from "@/components/ui/PageHeader";
import { LinkButton } from "@/components/ui/Button";
import { PrevistosTabla, type PrevistoFila } from "@/components/forms/PrevistosTabla";

export default async function PrevistosPage() {
  const perfil = await requireSection("caja-menuda");
  const puedeEliminar = esSoporteOJefe(perfil.rol);

  const supabase = await createClient();
  const [{ data: previstos }, { data: gastos }] = await Promise.all([
    supabase
      .from("caja_previstos")
      .select("id, fecha, colaborador, monto, entregado, vuelto")
      .order("fecha", { ascending: false }),
    supabase.from("caja_gastos").select("fecha, colaborador, monto").not("colaborador", "is", null),
  ]);

  const filas: PrevistoFila[] = (previstos ?? []).map((p) => {
    const real = (gastos ?? [])
      .filter((g) => g.fecha === p.fecha && g.colaborador === p.colaborador)
      .reduce((suma, g) => suma + Number(g.monto), 0);

    return {
      id: p.id as string,
      fecha: p.fecha as string,
      colaborador: p.colaborador as string,
      previsto: Number(p.monto),
      entregado: Number(p.entregado),
      vuelto: p.vuelto === null ? null : Number(p.vuelto),
      real,
      diferencia: real - Number(p.monto),
    };
  });

  return (
    <div>
      <PageHeader
        title="Caja Menuda — Previstos"
        description="Presupuesto diario de viáticos por colaborador, comparado contra lo realmente gastado (según los gastos registrados con ese mismo colaborador y fecha)."
        action={<LinkButton href="/caja-menuda/previstos/nuevo">+ Asignar previsto</LinkButton>}
      />
      <PrevistosTabla previstos={filas} puedeEliminar={puedeEliminar} />
    </div>
  );
}
