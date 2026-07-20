import type { createClient } from "@/lib/supabase/server";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

// Denominaciones de efectivo en circulacion en Panama (dolar estadounidense).
// El id es estable y se usa como clave en caja_arqueos.detalle (jsonb) y como
// sufijo de los campos del formulario -- no reordenar/eliminar valores una
// vez que existan arqueos guardados con ese id.
export const DENOMINACIONES = [
  { id: "b100", valor: 100, label: "$100", tipo: "billete" },
  { id: "b50", valor: 50, label: "$50", tipo: "billete" },
  { id: "b20", valor: 20, label: "$20", tipo: "billete" },
  { id: "b10", valor: 10, label: "$10", tipo: "billete" },
  { id: "b5", valor: 5, label: "$5", tipo: "billete" },
  { id: "b1", valor: 1, label: "$1", tipo: "billete" },
  { id: "m1", valor: 1, label: "$1 (moneda)", tipo: "moneda" },
  { id: "m50", valor: 0.5, label: "50¢", tipo: "moneda" },
  { id: "m25", valor: 0.25, label: "25¢", tipo: "moneda" },
  { id: "m10", valor: 0.1, label: "10¢", tipo: "moneda" },
  { id: "m05", valor: 0.05, label: "5¢", tipo: "moneda" },
  { id: "m01", valor: 0.01, label: "1¢", tipo: "moneda" },
] as const;

export type DenominacionId = (typeof DENOMINACIONES)[number]["id"];

export const META_CAJA = 500;
export const UMBRAL_ALERTA = 150;

// El saldo de la caja nunca se guarda: siempre se recalcula. Compartido
// entre el layout (para mostrarlo) y el arqueo (para guardar una foto del
// saldo esperado en el momento en que se cuenta el efectivo fisico).
//
// Los previstos entregan efectivo real (a veces mas del previsto, por no
// haber cambio exacto: ej. se necesitan $14 pero se entrega un billete de
// $20) asi que "entregado" sale de la caja igual que un gasto, y "vuelto"
// (el cambio que el colaborador devuelve, si aplica) vuelve a entrar igual
// que una reposicion.
export async function calcularSaldoActual(
  supabase: SupabaseServerClient,
): Promise<number> {
  const [{ data: reposiciones }, { data: gastos }, { data: previstos }] = await Promise.all([
    supabase.from("caja_reposiciones").select("monto"),
    supabase.from("caja_gastos").select("monto"),
    supabase.from("caja_previstos").select("entregado, vuelto"),
  ]);

  const totalRepuesto = (reposiciones ?? []).reduce(
    (suma: number, r: { monto: number }) => suma + Number(r.monto),
    0,
  );
  const totalGastado = (gastos ?? []).reduce(
    (suma: number, g: { monto: number }) => suma + Number(g.monto),
    0,
  );
  const totalEntregado = (previstos ?? []).reduce(
    (suma: number, p: { entregado: number }) => suma + Number(p.entregado),
    0,
  );
  const totalVuelto = (previstos ?? []).reduce(
    (suma: number, p: { vuelto: number | null }) => suma + Number(p.vuelto ?? 0),
    0,
  );

  return totalRepuesto - totalGastado - totalEntregado + totalVuelto;
}
