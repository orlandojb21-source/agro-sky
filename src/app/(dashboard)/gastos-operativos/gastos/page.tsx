import Link from "next/link";
import { requireSection } from "@/lib/session";
import { canWrite } from "@/lib/roles";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/PageHeader";
import { LinkButton } from "@/components/ui/Button";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { DeleteButton } from "@/components/ui/DeleteButton";
import { eliminarGastoAction } from "@/lib/actions/gastos";
import { CATEGORIA_GASTO_LABEL } from "@/lib/validation/gastos";
import { formatDateOnly, formatMoney } from "@/lib/format";

type GastoFila = {
  id: string;
  fecha: string;
  proveedorNombre: string | null;
  proyectoCodigo: string | null;
  categoria: string;
  categoriaOtro: string | null;
  numeroFactura: string | null;
  monto: number;
  estadoPago: "pagada" | "por_pagar";
  fechaTopePago: string | null;
};

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

  const totalGeneral = gastos.reduce((s, g) => s + g.monto, 0);

  const columns: Column<GastoFila>[] = [
    { header: "Fecha", render: (g) => formatDateOnly(g.fecha) },
    {
      header: "Categoría",
      render: (g) =>
        g.categoria === "otro" ? (g.categoriaOtro ?? "Otro") : (CATEGORIA_GASTO_LABEL[g.categoria] ?? g.categoria),
    },
    { header: "Proveedor", render: (g) => g.proveedorNombre ?? "—" },
    { header: "Proyecto", render: (g) => g.proyectoCodigo ?? "—" },
    { header: "N.° Factura", render: (g) => g.numeroFactura ?? "—" },
    { header: "Monto", render: (g) => formatMoney(g.monto) },
    {
      header: "Estado",
      render: (g) =>
        g.estadoPago === "pagada" ? (
          <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800 dark:bg-green-900/40 dark:text-green-300">
            Pagada
          </span>
        ) : (
          <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800 dark:bg-red-900/40 dark:text-red-300">
            Por pagar{g.fechaTopePago ? ` — tope ${formatDateOnly(g.fechaTopePago)}` : ""}
          </span>
        ),
    },
    ...(puedeEscribir
      ? [
          {
            header: "",
            render: (g: GastoFila) => (
              <div className="flex gap-3">
                <Link
                  href={`/gastos-operativos/gastos/${g.id}/editar`}
                  className="text-sm text-green-700 hover:underline dark:text-green-300"
                >
                  Editar
                </Link>
                <DeleteButton
                  action={eliminarGastoAction.bind(null, g.id)}
                  confirmMessage="¿Eliminar este gasto? Esta acción no se puede deshacer."
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
        title="Gastos"
        action={
          puedeEscribir ? <LinkButton href="/gastos-operativos/gastos/nuevo">+ Nuevo gasto</LinkButton> : undefined
        }
      />
      {gastos.length > 0 && (
        <p className="text-sm text-green-800 dark:text-green-200">
          Total registrado: <span className="font-semibold">{formatMoney(totalGeneral)}</span>
        </p>
      )}
      <DataTable rows={gastos} columns={columns} emptyMessage="Todavía no hay gastos registrados." />
    </div>
  );
}
