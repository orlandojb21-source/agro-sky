import { test, expect } from "@playwright/test";
import path from "node:path";

// Caso de prueba: control de acceso (autenticación + autorización por rol).
// Técnica: partición de equivalencia sobre el estado de sesión (con/sin
// sesión) y sobre el rol (administrador/jefe/soporte) contra las 2
// secciones con reglas de acceso distintas al resto (Usuarios y Balance).
// Ver tests/TEST_PLAN.md, sección "CP-AUTH".

const DIR_AUTH = path.resolve(__dirname, ".auth");

test.describe("Control de acceso", () => {
  test("CP-AUTH-01: sin sesión, entrar a una sección del dashboard redirige a /login", async ({
    page,
  }) => {
    await page.goto("/planilla");
    await expect(page).toHaveURL(/\/login/);
  });

  test("CP-AUTH-02: login con credenciales inválidas muestra un error, no entra", async ({ page }) => {
    await page.goto("/login");
    await page.locator('input[type="email"]').fill("no-existe@agrosky-test.local");
    await page.locator('input[type="password"]').fill("ClaveIncorrecta123");
    await page.locator('button[type="submit"]').first().click();
    await expect(page.getByText("Correo o contraseña incorrectos.")).toBeVisible({ timeout: 10000 });
    await expect(page).toHaveURL(/\/login/);
  });

  test("CP-AUTH-03: administrador no puede ver la sección Usuarios (restricción explícita)", async ({
    browser,
  }) => {
    const context = await browser.newContext({
      storageState: path.join(DIR_AUTH, "administrador.json"),
    });
    const page = await context.newPage();
    await page.goto("/usuarios");
    await expect(page).toHaveURL(/\/unauthorized/);
    await context.close();
  });

  test("CP-AUTH-04: administrador no puede ver la sección Balance (restricción explícita)", async ({
    browser,
  }) => {
    const context = await browser.newContext({
      storageState: path.join(DIR_AUTH, "administrador.json"),
    });
    const page = await context.newPage();
    await page.goto("/balance");
    await expect(page).toHaveURL(/\/unauthorized/);
    await context.close();
  });

  test("CP-AUTH-05: jefe sí puede ver Usuarios y Balance", async ({ browser }) => {
    const context = await browser.newContext({ storageState: path.join(DIR_AUTH, "jefe.json") });
    const page = await context.newPage();

    await page.goto("/usuarios");
    await expect(page).not.toHaveURL(/\/unauthorized/);

    await page.goto("/balance");
    await expect(page).not.toHaveURL(/\/unauthorized/);

    await context.close();
  });

  test("CP-AUTH-06: administrador sí puede ver Planilla e Informes (secciones abiertas a los 3 roles)", async ({
    browser,
  }) => {
    const context = await browser.newContext({
      storageState: path.join(DIR_AUTH, "administrador.json"),
    });
    const page = await context.newPage();

    await page.goto("/planilla");
    await expect(page).not.toHaveURL(/\/unauthorized/);

    await page.goto("/informes/campo");
    await expect(page).not.toHaveURL(/\/unauthorized/);

    await context.close();
  });
});
