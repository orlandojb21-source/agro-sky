import { test, expect } from "@playwright/test";
import path from "node:path";
import { adminDb, PREFIJO_QA } from "./qaData";

// Caso de prueba: los movimientos de Caja Menuda registrados antes del
// desglose por billete/moneda (migración 0014) guardan el monto en dólares
// con el detalle en null. La grilla de denominaciones del formulario de
// edición no los puede representar y abre en cero, así que reeditarlos
// -- por ejemplo, solo para corregirles la categoría -- llegó a borrarles
// el monto y descuadrar la caja (pasó de verdad el 2026-08-14 con un
// movimiento de $35.00). Técnica: prueba de caja negra basada en el
// defecto real, cubriendo las dos ramas de montoConservandoHeredado
// (no marcar billetes = se conserva / marcar billetes = reemplaza).
// Ver tests/TEST_PLAN.md, sección "CP-CAJA".

const DIR_AUTH = path.resolve(__dirname, ".auth");
const NOMBRE = `${PREFIJO_QA} Movimiento antiguo`;
const MONTO_HEREDADO = 35;
const FECHA = "2026-07-08"; // fecha vieja a propósito: solo Soporte/Jefe pueden editarla

let movimientoId: string;
let categoriaInicial: string;
let categoriaNueva: string;

async function montoEnBaseDeDatos(): Promise<{ monto: number | null; categoria: string | null }> {
  const { data, error } = await adminDb
    .from("caja_gastos")
    .select("monto, categoria")
    .eq("id", movimientoId)
    .single();
  if (error) throw new Error(`No se pudo releer el movimiento QA: ${error.message}`);
  return { monto: data.monto === null ? null : Number(data.monto), categoria: data.categoria };
}

test.describe("Caja Menuda — editar un movimiento sin desglose por billete", () => {
  test.beforeAll(async () => {
    const { data: categorias, error: errorCategorias } = await adminDb
      .from("categorias_gasto")
      .select("nombre")
      .eq("contexto", "caja_menuda")
      .order("nombre")
      .limit(2);
    if (errorCategorias || !categorias || categorias.length < 2) {
      throw new Error("Se necesitan al menos 2 categorías de Caja Menuda para esta prueba.");
    }
    categoriaInicial = categorias[0].nombre as string;
    categoriaNueva = categorias[1].nombre as string;

    // Movimiento "antiguo": monto en dólares, sin monto_detalle -- igual
    // que los que quedaron de antes de la migración 0014.
    const { data, error } = await adminDb
      .from("caja_gastos")
      .insert({
        fecha: FECHA,
        nombre: NOMBRE,
        concepto: "Transporte",
        categoria: categoriaInicial,
        monto: MONTO_HEREDADO,
        monto_detalle: null,
      })
      .select("id")
      .single();
    if (error || !data) throw new Error(`No se pudo sembrar el movimiento QA: ${error?.message}`);
    movimientoId = data.id;
  });

  test.afterAll(async () => {
    if (movimientoId) await adminDb.from("caja_gastos").delete().eq("id", movimientoId);
  });

  test("cambiar solo la categoría conserva el monto heredado", async ({ browser }) => {
    const context = await browser.newContext({ storageState: path.join(DIR_AUTH, "soporte.json") });
    const page = await context.newPage();

    await page.goto(`/gastos-operativos/movimiento/${movimientoId}/editar`);

    // El aviso debe decirle al usuario cuánto vale el movimiento, porque
    // la grilla de billetes aparece en cero y sin el aviso parecería que
    // el movimiento no tiene monto.
    await expect(page.getByText(/se registró antes del desglose por billetes/i)).toContainText("35.00");

    await page.locator('select[name="categoria"]').selectOption(categoriaNueva);
    await page.getByRole("button", { name: /guardar cambios/i }).click();
    await page.waitForURL("**/gastos-operativos");

    const guardado = await montoEnBaseDeDatos();
    expect(guardado.categoria).toBe(categoriaNueva);
    expect(guardado.monto).toBe(MONTO_HEREDADO);

    await context.close();
  });

  test("marcar billetes sí reemplaza el monto heredado", async ({ browser }) => {
    const context = await browser.newContext({ storageState: path.join(DIR_AUTH, "soporte.json") });
    const page = await context.newPage();

    await page.goto(`/gastos-operativos/movimiento/${movimientoId}/editar`);

    // Un billete de $20 -> el movimiento pasa a valer $20 y por fin queda
    // con su desglose, en vez de conservar los $35 heredados.
    await page.locator('input[name="monto_b20"]').first().fill("1");
    await page.getByRole("button", { name: /guardar cambios/i }).click();
    await page.waitForURL("**/gastos-operativos");

    const guardado = await montoEnBaseDeDatos();
    expect(guardado.monto).toBe(20);

    await context.close();
  });
});
