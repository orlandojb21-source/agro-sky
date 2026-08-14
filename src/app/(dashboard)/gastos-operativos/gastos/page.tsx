import { requireSection } from "@/lib/session";
import { canWrite } from "@/lib/roles";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/PageHeader";
import { LinkButton } from "@/components/ui/Button";
import { GastosTabla, type GastoFila } from "@/components/forms/GastosTabla";

export default async function GastosPage() {
  const perfil = await requireSection("gastos-operativos");
  const puedeEscribir = canWrite(perfil.rol, "gastos-operativos");

  const supabase = await createClient();
  const { data } = await supabase
    .from("gastos")
    .select(
      "id, fecha, categoria, categoria_otro, numero_factura, monto, estado_pago, fecha_tope_pago, proveedores ( nombre ), proyectos ( codigo )",
    )
    .order("fecha", { ascending: false });

  const gastos: GastoFila[] = (data ?? []).map((g) => ({
    id: g.id as string,
    fecha: g.fecha as string,
    proveedorNombre: (g.proveedores as unknown as { nombre: string } | null)?.nombre ?? null,
    proyectoCodigo: (g.proyectos as unknown as { codigo: string } | null)?.codigo ?? null,
    categoria: g.categoria as string,
    categoriaOtro: g.categoria_otro as string | null,
    numeroFactura: g.numero_factura as string | null,
    monto: Number(g.monto),
    estadoPago: g.estado_pago as "pagada" | "por_pagar",
    fechaTopePago: g.fecha_tope_pago as string | null,
  }));

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Gastos"
        action={
          puedeEscribir ? <LinkButton href="/gastos-operativos/gastos/nuevo">+ Nuevo gasto</LinkButton> : undefined
        }
      />
      <GastosTabla gastos={gastos} puedeEscribir={puedeEscribir} />
    </div>
  );
}
