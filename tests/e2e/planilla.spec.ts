import { test, expect, type Page } from "@playwright/test";
import path from "node:path";
import { adminDb, PREFIJO_QA } from "./qaData";

// Caso de prueba: el flujo de negocio más importante de la app --
// Asistencia -> Informe de Campo -> cálculo de pago de Planilla. Técnica:
// prueba de caja negra basada en escenario real (workflow-based testing),
// con un valor límite conocido para el cálculo del incentivo por hectárea
// (verificado contra la fórmula documentada en lib/calculoIncentivos.ts).
// Ver tests/TEST_PLAN.md, sección "CP-PLANILLA".

const DIR_AUTH = path.resolve(__dirname, ".auth");
const COLABORADOR = `${PREFIJO_QA} Operador Planilla`;
const FECHA = "2026-05-10";
const HECTAREAS = 20; // 15 incluidas en el salario base + 5 de excedente
// Fórmula esperada (Operador, Ingenio Santa Rosa): base 30 + (20-15) x 1.5 = 37.5
const MONTO_ESPERADO = 37.5;

async function dibujarFirma(page: Page, canvasLocator: ReturnType<Page["locator"]>) {
  await canvasLocator.scrollIntoViewIfNeeded();
  const box = await canvasLocator.boundingBox();
  if (!box) throw new Error("No se pudo ubicar el canvas de firma.");
  await page.mouse.move(box.x + 20, box.y + 20);
  await page.mouse.down();
  await page.mouse.move(box.x + 100, box.y + 60, { steps: 5 });
  await page.mouse.move(box.x + 180, box.y + 30, { steps: 5 });
  await page.mouse.up();
}

test.describe("Planilla — Asistencia + Informe de Campo + Pago", () => {
  test.beforeAll(async () => {
    const { error } = await adminDb.from("colaboradores").insert({ nombre: COLABORADOR, tipo: "campo" });
    if (error) throw new Error(`No se pudo sembrar el colaborador QA: ${error.message}`);
  });

  test.afterAll(async () => {
    await adminDb.from("planilla_pagos").delete().eq("colaborador", COLABORADOR);
    await adminDb.from("planilla_asistencia").delete().eq("colaborador", COLABORADOR);
    // .maybeSingle() esperaría 0 o 1 fila -- si una corrida anterior dejó
    // más de una sin limpiar, hay que borrarlas TODAS, no solo la primera.
    const { data: informes } = await adminDb
      .from("informes_campo")
      .select("id, firma_agro_ruta, firma_cliente_ruta")
      .eq("operador", COLABORADOR);
    for (const informe of informes ?? []) {
      const rutas = [informe.firma_agro_ruta, informe.firma_cliente_ruta].filter(
        (r): r is string => Boolean(r),
      );
      if (rutas.length > 0) await adminDb.storage.from("informes-campo-firmas").remove(rutas);
      // Delete directo (no el RPC eliminar_informe_campo): ese RPC exige
      // auth_tiene_perfil(), que la service_role key no satisface por sí
      // sola -- ver el comentario en qaData.ts. Las filas hijas se van
      // solas por el ON DELETE CASCADE del esquema.
      await adminDb.from("informes_campo").delete().eq("id", informe.id);
    }
    await adminDb.from("colaboradores").delete().eq("nombre", COLABORADOR);
  });

  test("CP-PLANILLA-01: registrar Asistencia de un día de Proyecto", async ({ browser }) => {
    const context = await browser.newContext({ storageState: path.join(DIR_AUTH, "jefe.json") });
    const page = await context.newPage();

    await page.goto("/planilla/nuevo");
    await page.locator('select[name="colaborador"]').selectOption(COLABORADOR);
    await page.locator('input[name="fecha"]').fill(FECHA);
    await page.locator('select[name="rolDia"]').selectOption("operador");
    await page.locator('select[name="tipoTrabajo"]').selectOption("proyecto");
    await page.locator('input[name="descripcion"]').fill(`${PREFIJO_QA} — suite de pruebas`);
    await page.getByRole("button", { name: /Guardar/ }).click();
    await page.waitForURL(/\/planilla$/, { timeout: 15000 });

    await expect(page.locator("table tbody").getByText(COLABORADOR).first()).toBeVisible();
    await context.close();
  });

  test("CP-PLANILLA-02: registrar el Informe de Campo del mismo día con 20 hectáreas", async ({
    browser,
  }) => {
    const context = await browser.newContext({ storageState: path.join(DIR_AUTH, "jefe.json") });
    const page = await context.newPage();

    await page.goto("/informes/campo/nuevo");
    await page.locator('input[name="cliente"]').fill(`${PREFIJO_QA} Cliente`);
    await page.locator('select[name="tipoProyecto"]').selectOption("ingenio_santa_rosa");
    await page.locator('input[name="fecha"]').fill(FECHA);
    await page.locator('input[name="finca"]').fill("Finca QA");
    await page.locator('input[name="horaInicio"]').fill("07:00");
    await page.locator('input[name="horaFin"]').fill("09:00");
    await page.locator('input[name="meteorologia"]').fill("Despejado");
    await page.locator("table input").first().fill("1");
    await page.locator("table input[type='number']").first().fill(String(HECTAREAS));
    await page.locator('input[name="modeloDrone"]').fill("T40");
    await page.locator('input[name="dosisPorHectarea"]').fill("10");
    await page.locator('select[name="operador"]').selectOption(COLABORADOR);
    await page.locator('input[name="nombreFirmaAgro"]').fill("QA Encargado Agro");
    await page.locator('input[name="nombreFirmaCliente"]').fill("QA Encargado Cliente");

    const canvases = page.locator("canvas");
    await dibujarFirma(page, canvases.nth(0));
    await page.getByRole("button", { name: "Guardar firma" }).first().click();
    await expect(page.getByText("Firma guardada ✓").first()).toBeVisible({ timeout: 10000 });

    await dibujarFirma(page, canvases.nth(1));
    await page.getByRole("button", { name: "Guardar firma" }).first().click();
    await expect(page.getByText("Firma guardada ✓").nth(1)).toBeVisible({ timeout: 10000 });

    await page.getByRole("button", { name: "Guardar informe" }).click();
    await page.waitForURL(/\/informes\/campo\/[0-9a-f-]+$/, { timeout: 15000 });

    await context.close();
  });

  test("CP-PLANILLA-03: 'Calcular pago sugerido' devuelve el monto correcto (30 + (20-15)×1.5 = 37.50)", async ({
    browser,
  }) => {
    const context = await browser.newContext({ storageState: path.join(DIR_AUTH, "jefe.json") });
    const page = await context.newPage();

    await page.goto("/planilla/pagos/nuevo");
    await page.locator('select[name="colaborador"]').selectOption({ label: `${COLABORADOR} — Campo` });
    await page.locator('input[name="fechaDesde"]').fill(FECHA);
    await page.locator('input[name="fecha"]').fill(FECHA);
    await page.getByRole("button", { name: "Calcular pago sugerido" }).click();
    await page.waitForSelector("text=día(s) registrados", { timeout: 15000 });

    const montoInput = page.locator('input[name="monto"]');
    await expect(montoInput).toHaveValue(String(MONTO_ESPERADO), { timeout: 10000 });

    await page.locator('input[name="descripcion"]').fill(`${PREFIJO_QA} — pago de prueba`);
    await page.getByRole("button", { name: "Guardar pago" }).click();
    await page.waitForURL(/\/planilla\/pagos$/, { timeout: 15000 });

    await expect(page.getByText(COLABORADOR).first()).toBeVisible();
    await context.close();
  });
});
