import { createClient } from "@/lib/supabase/server";
import { InventarioSubNav } from "@/components/layout/InventarioSubNav";
import { formatMoney } from "@/lib/format";

export default async function InventarioLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data } = await supabase.from("productos").select("costo, cantidad, fila, contenedor");
  const productos = data ?? [];

  const valorTotal = productos.reduce(
    (suma, p) => suma + Number(p.costo) * (p.cantidad as number),
    0,
  );
  const articulosTotal = productos.reduce((suma, p) => suma + (p.cantidad as number), 0);

  // Un contenedor real es la combinacion fila+contenedor: el mismo numero
  // de contenedor puede repetirse en filas distintas, pero es otro lugar.
  const contenedoresUnicos = new Set(
    productos
      .filter((p) => p.fila && p.contenedor)
      .map((p) => `${p.fila}__${p.contenedor}`),
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-green-100 bg-white p-4 shadow-sm dark:border-green-900/40 dark:bg-green-950/10">
          <p className="text-xs uppercase tracking-wide text-green-700/70 dark:text-green-300/70">
            Valor total del inventario
          </p>
          <p className="mt-1 text-2xl font-semibold text-green-900 dark:text-green-50">
            {formatMoney(valorTotal)}
          </p>
        </div>
        <div className="rounded-xl border border-green-100 bg-white p-4 shadow-sm dark:border-green-900/40 dark:bg-green-950/10">
          <p className="text-xs uppercase tracking-wide text-green-700/70 dark:text-green-300/70">
            Artículos del inventario
          </p>
          <p className="mt-1 text-2xl font-semibold text-green-900 dark:text-green-50">
            {articulosTotal}
          </p>
        </div>
        <div className="rounded-xl border border-green-100 bg-white p-4 shadow-sm dark:border-green-900/40 dark:bg-green-950/10">
          <p className="text-xs uppercase tracking-wide text-green-700/70 dark:text-green-300/70">
            Cantidad de contenedores
          </p>
          <p className="mt-1 text-2xl font-semibold text-green-900 dark:text-green-50">
            {contenedoresUnicos.size}
          </p>
        </div>
      </div>

      <InventarioSubNav />
      {children}
    </div>
  );
}
