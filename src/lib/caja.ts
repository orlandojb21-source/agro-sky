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
// Un movimiento (caja_gastos) puede ser un gasto simple (monto) o una
// entrega de previsto/viaticos (entregado, a veces mayor al previsto por
// no haber cambio exacto: ej. se necesitan $14 pero se entrega un billete
// de $20). Lo que realmente sale de la caja es "entregado" si esta
// presente, si no "monto". "vuelto" (el cambio devuelto, si aplica)
// siempre vuelve a entrar.
export async function calcularSaldoActual(
  supabase: SupabaseServerClient,
): Promise<number> {
  const [{ data: reposiciones }, { data: gastos }] = await Promise.all([
    supabase.from("caja_reposiciones").select("monto"),
    supabase.from("caja_gastos").select("monto, entregado, vuelto"),
  ]);

  const totalRepuesto = (reposiciones ?? []).reduce(
    (suma: number, r: { monto: number }) => suma + Number(r.monto),
    0,
  );
  const totalSalida = (gastos ?? []).reduce(
    (suma: number, g: { monto: number | null; entregado: number | null }) =>
      suma + Number(g.entregado ?? g.monto ?? 0),
    0,
  );
  const totalVuelto = (gastos ?? []).reduce(
    (suma: number, g: { vuelto: number | null }) => suma + Number(g.vuelto ?? 0),
    0,
  );

  return totalRepuesto - totalSalida + totalVuelto;
}

export type VistaPrevia = {
  fechaArqueo: string | null;
  detalle: Record<string, number>;
};

// Efectivo estimado en caja, por denominacion: parte del ultimo arqueo (o
// de cero si nunca se ha hecho uno) y le resta/suma los billetes y monedas
// de cada movimiento registrado DESPUES de ese arqueo. Los movimientos sin
// desglose por denominacion (de antes de que existiera este campo) se
// ignoran aqui -- no hay como saber que billetes usaron, asi que no ajustan
// la vista previa, aunque su monto en dolares si siga contando para
// calcularSaldoActual().
export async function calcularVistaPreviaActual(
  supabase: SupabaseServerClient,
): Promise<VistaPrevia> {
  const { data: ultimoArqueo } = await supabase
    .from("caja_arqueos")
    .select("fecha, detalle, creado_en")
    .order("fecha", { ascending: false })
    .order("creado_en", { ascending: false })
    .limit(1)
    .maybeSingle();

  const detalle: Record<string, number> = {};
  for (const d of DENOMINACIONES) {
    detalle[d.id] = Number((ultimoArqueo?.detalle as Record<string, number> | null)?.[d.id] ?? 0);
  }

  const desdeCreadoEn = (ultimoArqueo?.creado_en as string | undefined) ?? "1970-01-01T00:00:00Z";

  const [{ data: gastos }, { data: reposiciones }] = await Promise.all([
    supabase
      .from("caja_gastos")
      .select("monto_detalle, entregado_detalle, vuelto_detalle")
      .gt("creado_en", desdeCreadoEn),
    supabase.from("caja_reposiciones").select("monto_detalle").gt("creado_en", desdeCreadoEn),
  ]);

  function aplicar(det: Record<string, number> | null | undefined, signo: 1 | -1) {
    if (!det) return;
    for (const d of DENOMINACIONES) {
      const cantidad = Number(det[d.id] ?? 0);
      if (cantidad) detalle[d.id] += signo * cantidad;
    }
  }

  for (const g of gastos ?? []) {
    aplicar(g.monto_detalle as Record<string, number> | null, -1);
    aplicar(g.entregado_detalle as Record<string, number> | null, -1);
    aplicar(g.vuelto_detalle as Record<string, number> | null, 1);
  }
  for (const r of reposiciones ?? []) {
    aplicar(r.monto_detalle as Record<string, number> | null, 1);
  }

  return { fechaArqueo: (ultimoArqueo?.fecha as string | undefined) ?? null, detalle };
}

// Reconstruye, a partir de los campos "{prefijo}_{id}" del formulario (ej.
// "monto_b20"), cuantos billetes/monedas se marcaron y el total en dolares
// equivalente. Devuelve null si no se marco ninguna cantidad -- mismo
// significado que un campo de monto dejado en blanco (no se guarda nada
// para ese monto).
export function detalleDesdeFormData(
  raw: Record<string, string>,
  prefijo: string,
): { detalle: Record<string, number>; total: number } | null {
  const detalle: Record<string, number> = {};
  let total = 0;
  let algunaCantidad = false;

  for (const d of DENOMINACIONES) {
    const cantidad = Math.max(0, Math.trunc(Number(raw[`${prefijo}_${d.id}`]) || 0));
    detalle[d.id] = cantidad;
    if (cantidad > 0) algunaCantidad = true;
    total += cantidad * d.valor;
  }

  if (!algunaCantidad) return null;
  return { detalle, total: Math.round(total * 100) / 100 };
}
