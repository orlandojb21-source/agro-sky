import { test, expect } from "@playwright/test";
import path from "node:path";
import { adminDb, PREFIJO_QA } from "./qaData";

// Caso de prueba: la sección Informes (3 pestañas: Campo, Diario,
// Proyecto) y que las rutas antiguas ya no existan tras la reestructura de
// navegación. Técnica: prueba de navegación + caja negra sobre el CRUD de
// Informe de Proyecto e Informe Diario. Ver tests/TEST_PLAN.md, sección
// "CP-INFORMES".

const DIR_AUTH = path.resolve(__dirname, ".auth");

test.describe("Informes — navegación y CRUD", () => {
  test("CP-INFORMES-01: las 3 pestañas navegan y las rutas viejas devuelven 404", async ({
    browser,
  }) => {
    const context = await browser.newContext({ storageState: path.join(DIR_AUTH, "jefe.json") });
    const page = await context.newPage();

    await page.goto("/informes/campo");
    await expect(page.getByRole("link", { name: "Informe de Campo" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Informe Diario" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Análisis de Proyecto" })).toBeVisible();

    await page.getByRole("link", { name: "Análisis de Proyecto" }).click();
    await expect(page).toHaveURL(/\/informes\/proyecto$/);

    const respViejaProyectos = await page.goto("/proyectos", { waitUntil: "domcontentloaded" });
    expect(respViejaProyectos?.status()).toBe(404);

    const respViejaCampo = await page.goto("/informes-campo", { waitUntil: "domcontentloaded" });
    expect(respViejaCampo?.status()).toBe(404);

    await context.close();
  });

  test("CP-INFORMES-02: elegir un Proyecto carga Cliente/Hectáreas solos, y el Total se calcula solo", async ({
    browser,
  }) => {
    const nombreCliente = `${PREFIJO_QA} Cliente Analisis`;
    const { data: cliente, error: errorCliente } = await adminDb
      .from("clientes")
      .insert({ nombre: nombreCliente })
      .select("id")
      .single();
    if (errorCliente || !cliente) throw new Error(`No se pudo sembrar el Cliente QA: ${errorCliente?.message}`);
    const { data: proyecto, error: errorProyecto } = await adminDb
      .from("proyectos")
      .insert({ nombre: `${PREFIJO_QA} Semana 1`, cliente_id: cliente.id, tipo_proyecto: "particular" })
      .select("id, codigo")
      .single();
    if (errorProyecto || !proyecto) throw new Error(`No se pudo sembrar el Proyecto QA: ${errorProyecto?.message}`);

    const { data: informeCampo, error: errorInforme } = await adminDb
      .from("informes_campo")
      .insert({
        cliente: nombreCliente,
        fecha: "2026-05-20",
        finca: "Finca QA Analisis",
        hora_inicio: "07:00",
        hora_fin: "09:00",
        meteorologia: "Despejado",
        modelo_drone: "T30",
        dosis_por_hectarea: 8,
        operador: `${PREFIJO_QA} Operador Analisis`,
        ayudantes: [],
        tipo_proyecto: "particular",
        proyecto_id: proyecto.id,
      })
      .select("id")
      .single();
    if (errorInforme || !informeCampo) throw new Error(`No se pudo sembrar el Informe de Campo QA: ${errorInforme?.message}`);
    await adminDb
      .from("informe_campo_parcelas")
      .insert({ informe_id: informeCampo.id, numero_parcela: "1", hectareas: 12 });

    const context = await browser.newContext({ storageState: path.join(DIR_AUTH, "jefe.json") });
    const page = await context.newPage();

    await page.goto("/informes/proyecto/nuevo");
    await page.locator('select[name="proyectoId"]').selectOption(proyecto.id);

    // Cliente y Hectáreas se cargan solos al elegir el Proyecto (llamada al
    // servidor, ver obtenerDatosProyectoAction) -- se espera a que termine.
    // Se busca dentro de <p> (no getByText genérico) porque el nombre del
    // cliente también aparece dentro de la opción elegida del <select>.
    await expect(page.locator("p", { hasText: nombreCliente })).toBeVisible({ timeout: 10000 });
    await expect(page.locator("p", { hasText: "12" }).first()).toBeVisible();

    await page.locator('input[name="ubicacion"]').fill("El Roble, QA");
    await page.locator('input[name="precio"]').fill("5");
    // Total = Hectáreas (12) x Precio (5) = 60, calculado solo (sin campo
    // editable) -- se verifica leyendo el bloque de Total directamente.
    await expect(page.getByText("USD 60.00", { exact: true })).toBeVisible();

    await page.locator("table input").first().fill(`${PREFIJO_QA} Drone`);
    const inputsNum = page.locator("table input[type='number']");
    await inputsNum.nth(0).fill("10");
    await inputsNum.nth(1).fill("50");
    await page.getByRole("button", { name: "Guardar informe" }).click();
    await page.waitForURL(/\/informes\/proyecto\/[0-9a-f-]+$/, { timeout: 15000 });

    // getByRole (no getByText genérico) para no chocar con el
    // "__next-route-announcer__" que Next.js agrega para lectores de
    // pantalla y que repite el mismo texto del <h1> tras cada navegación.
    await expect(page.getByRole("heading", { name: new RegExp(proyecto.codigo) })).toBeVisible();
    const idInforme = page.url().split("/").pop()!;

    const { data: informeGuardado } = await adminDb
      .from("proyecto_informes")
      .select("proyecto_id, hectareas, precio, total")
      .eq("id", idInforme)
      .single();
    expect(informeGuardado?.proyecto_id).toBe(proyecto.id);
    expect(Number(informeGuardado?.hectareas)).toBe(12);
    expect(Number(informeGuardado?.total)).toBe(60);

    await page.goto("/informes/proyecto");
    await expect(page.getByText(new RegExp(proyecto.codigo)).first()).toBeVisible();

    const fila = page.locator("tr", { hasText: proyecto.codigo }).first();
    page.once("dialog", (dialog) => dialog.accept());
    await fila.getByRole("button", { name: "Eliminar" }).click();

    // Se verifica contra la base de datos (no solo la UI) para no depender
    // del timing de recompilación de Turbopack en modo desarrollo.
    await expect
      .poll(
        async () => {
          const { data } = await adminDb.from("proyecto_informes").select("id").eq("id", idInforme);
          return data?.length ?? 0;
        },
        { timeout: 15000 },
      )
      .toBe(0);

    await context.close();

    await adminDb.from("informes_campo").delete().eq("id", informeCampo.id);
    await adminDb.from("proyectos").delete().eq("id", proyecto.id);
    await adminDb.from("clientes").delete().eq("id", cliente.id);
  });

  test("CP-INFORMES-03: crear un Informe Diario vinculado a un Informe de Campo existente", async ({
    browser,
  }) => {
    const clienteInformeCampo = `${PREFIJO_QA} Cliente Diario`;
    const { data: cliente, error: errorCliente } = await adminDb
      .from("clientes")
      .insert({ nombre: clienteInformeCampo })
      .select("id")
      .single();
    if (errorCliente || !cliente) throw new Error(`No se pudo sembrar el Cliente QA: ${errorCliente?.message}`);
    const { data: proyecto, error: errorProyecto } = await adminDb
      .from("proyectos")
      .insert({ nombre: clienteInformeCampo, cliente_id: cliente.id, tipo_proyecto: "particular" })
      .select("id")
      .single();
    if (errorProyecto || !proyecto) throw new Error(`No se pudo sembrar el Proyecto QA: ${errorProyecto?.message}`);

    const { data: informeCampo, error } = await adminDb
      .from("informes_campo")
      .insert({
        cliente: clienteInformeCampo,
        fecha: "2026-05-15",
        finca: "Finca QA Diario",
        hora_inicio: "07:00",
        hora_fin: "09:00",
        meteorologia: "Despejado",
        modelo_drone: "T30",
        dosis_por_hectarea: 8,
        operador: `${PREFIJO_QA} Operador Diario`,
        ayudantes: [],
        tipo_proyecto: "particular",
        proyecto_id: proyecto.id,
      })
      .select("id")
      .single();
    if (error || !informeCampo) throw new Error(`No se pudo sembrar el Informe de Campo QA: ${error?.message}`);
    await adminDb
      .from("informe_campo_parcelas")
      .insert({ informe_id: informeCampo.id, numero_parcela: "1", hectareas: 6 });

    const context = await browser.newContext({ storageState: path.join(DIR_AUTH, "jefe.json") });
    const page = await context.newPage();

    await page.goto("/informes/diario/nuevo");
    await page.locator('select[name="informeCampoId"]').selectOption(informeCampo.id);
    await expect(page.locator('input[name="cliente"]')).toHaveValue(clienteInformeCampo);
    await expect(page.locator('input[name="hectareasAplicadas"]')).toHaveValue("6");

    await page.locator('input[name="tipoAplicacion"]').fill("Foliar");
    await page.locator('input[name="boquillas"]').fill("TXA 8003");
    await page.locator('input[name="alturaVuelo"]').fill("2.5 m");
    await page.locator('input[name="anchoPases"]').fill("9 m");
    await page.locator('input[name="velocidad"]').fill("5 m/s");
    await page.getByRole("button", { name: "Guardar informe" }).click();
    // crearInformeDiarioAction redirige a la lista, no al detalle (a
    // diferencia de Informe de Campo/Proyecto) -- comportamiento real de
    // la app, no un descuido de la prueba.
    await page.waitForURL(/\/informes\/diario$/, { timeout: 15000 });

    await expect(page.getByText(clienteInformeCampo).first()).toBeVisible();

    await context.close();

    await adminDb.from("informes_diarios").delete().eq("informe_campo_id", informeCampo.id);
    await adminDb.from("informes_campo").delete().eq("id", informeCampo.id);
    await adminDb.from("proyectos").delete().eq("id", proyecto.id);
    await adminDb.from("clientes").delete().eq("id", cliente.id);
  });
});
