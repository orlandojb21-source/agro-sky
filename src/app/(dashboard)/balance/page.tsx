import { requireSection } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/PageHeader";
import {
  BalanceDashboard,
  type VentaBalance,
  type PagoPlanillaBalance,
  type GastoCompraBalance,
  type PrestamoBalance,
} from "@/components/forms/BalanceDashboard";
import type { MovimientoExportable } from "@/lib/exportar";
import { obtenerCategoriasGasto, obtenerCategoriasCompraConTipo } from "@/lib/categorias";

export default async function BalancePage() {
  await requireSection("balance");

  const supabase = await createClient();
  const [
    { data: gastos },
    { data: reposiciones },
    { data: ventasData },
    { data: pagosData },
    { data: colaboradoresData },
    { data: gastosComprasData },
    { data: prestamosData },
    categoriasCajaMenuda,
    categoriasCompras,
  ] = await Promise.all([
    supabase
      .from("caja_gastos")
      .select(
        "fecha, categoria, nombre, numero_recibo, concepto, monto, colaborador, previsto, entregado, vuelto, nota",
      )
      .order("fecha", { ascending: false }),
    supabase.from("caja_reposiciones").select("fecha, monto, nota").order("fecha", { ascending: false }),
    supabase
      .from("ventas")
      .select("fecha, subtotal_gravado, subtotal_exento, itbms")
      .order("fecha", { ascending: false }),
    supabase
      .from("planilla_pagos")
      .select("fecha, colaborador, monto, bonificacion, decimo_tercer_mes, monto_prestamo")
      .order("fecha", { ascending: false }),
    supabase.from("colaboradores").select("nombre").order("nombre"),
    supabase
      .from("gastos")
      .select("fecha, categoria, categoria_otro, numero_factura, monto, proveedores ( nombre )")
      .order("fecha", { ascending: false }),
    supabase.from("prestamos").select("fecha, monto").order("fecha", { ascending: false }),
    obtenerCategoriasGasto(supabase, "caja_menuda"),
    obtenerCategoriasCompraConTipo(supabase),
  ]);

  const movimientos: MovimientoExportable[] = [
    ...(gastos ?? []).map((g) => ({
      fecha: g.fecha as string,
      tipo: "gasto" as const,
      categoria: g.categoria as string | null,
      nombre: g.nombre as string | null,
      numeroRecibo: g.numero_recibo as string | null,
      concepto: g.concepto as string | null,
      colaborador: g.colaborador as string | null,
      previsto: g.previsto === null ? null : Number(g.previsto),
      entregado: g.entregado === null ? null : Number(g.entregado),
      vuelto: g.vuelto === null ? null : Number(g.vuelto),
      // El gasto real es lo entregado menos el vuelto que regreso (ej: se
      // entrega un billete de $20 para un gasto de $14, vuelven $6 -- el
      // gasto real es $14, no los $20 entregados). Sin esto, "Egresos" en
      // Balance quedaba inflado por el total del vuelto sin registrar.
      monto: Number(g.entregado ?? g.monto ?? 0) - Number(g.vuelto ?? 0),
      nota: g.nota as string | null,
    })),
    ...(reposiciones ?? []).map((r) => ({
      fecha: r.fecha as string,
      tipo: "reposicion" as const,
      categoria: null,
      nombre: null,
      numeroRecibo: null,
      concepto: null,
      colaborador: null,
      previsto: null,
      entregado: null,
      vuelto: null,
      monto: Number(r.monto),
      nota: r.nota as string | null,
    })),
  ];

  const ventas: VentaBalance[] = (ventasData ?? []).map((v) => ({
    fecha: v.fecha as string,
    ingreso: Number(v.subtotal_gravado) + Number(v.subtotal_exento),
    itbms: Number(v.itbms),
  }));

  const pagosPlanilla: PagoPlanillaBalance[] = (pagosData ?? []).map((p) => {
    const montoPrestamo = Number(p.monto_prestamo ?? 0);
    return {
      fecha: p.fecha as string,
      colaborador: p.colaborador as string,
      // La bonificacion y el Decimo Tercer Mes tambien son costo real de
      // planilla, aunque no tengan CSS/Seguro Educativo (bonificacion) o
      // solo lleven CSS (Decimo) -- se incluyen en el total pagado. El
      // descuento de préstamo, en cambio, NO es plata que vuelve a salir
      // de la empresa esta quincena -- ya salió cuando se dio el préstamo
      // (se ve aparte, en la sección Préstamos), así que se resta acá para
      // que el total de Planilla refleje el gasto real de esta quincena.
      monto: Number(p.monto) + Number(p.bonificacion ?? 0) + Number(p.decimo_tercer_mes ?? 0) - montoPrestamo,
      montoPrestamo,
    };
  });

  const colaboradores = (colaboradoresData ?? []).map((c) => c.nombre as string);

  const gastosCompras: GastoCompraBalance[] = (gastosComprasData ?? []).map((g) => ({
    fecha: g.fecha as string,
    categoria: g.categoria as string,
    categoriaOtro: g.categoria_otro as string | null,
    proveedorNombre: (g.proveedores as unknown as { nombre: string } | null)?.nombre ?? null,
    numeroFactura: g.numero_factura as string | null,
    monto: Number(g.monto),
  }));

  const prestamos: PrestamoBalance[] = (prestamosData ?? []).map((p) => ({
    fecha: p.fecha as string,
    monto: Number(p.monto),
  }));

  return (
    <div>
      <PageHeader
        title="Balance"
        description="Todo el dinero que entra y sale de Agro Sky: Ventas, Caja Menuda, Planilla y Gastos de Compras."
      />
      <BalanceDashboard
        movimientos={movimientos}
        ventas={ventas}
        pagosPlanilla={pagosPlanilla}
        colaboradores={colaboradores}
        gastosCompras={gastosCompras}
        prestamos={prestamos}
        categoriasCajaMenuda={categoriasCajaMenuda}
        categoriasCompras={categoriasCompras}
      />
    </div>
  );
}
