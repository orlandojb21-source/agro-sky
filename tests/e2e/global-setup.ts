import { chromium, type FullConfig } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { crearCuentaQA, limpiarCuentasQAHuerfanas, limpiarDatosQA, type CuentaQA, type RolQA } from "./qaData";

const DIR_AUTH = path.resolve(__dirname, ".auth");

// Corre una vez antes de toda la suite: limpia cualquier resto de una
// corrida anterior que se haya interrumpido (datos primero, cuentas
// después -- ver el comentario de global-teardown.ts sobre por qué
// importa el orden), crea 1 cuenta QA por cada rol (administrador/jefe/
// soporte -- los specs de control de acceso los necesitan a los 3) y
// guarda su sesión ya iniciada (storageState) para que los specs no
// tengan que repetir el login en cada archivo.
export default async function globalSetup(config: FullConfig) {
  await limpiarDatosQA();
  await limpiarCuentasQAHuerfanas();

  mkdirSync(DIR_AUTH, { recursive: true });

  const baseURL = config.projects[0]?.use?.baseURL ?? "http://localhost:3000";
  const roles: RolQA[] = ["administrador", "jefe", "soporte"];
  const cuentas: CuentaQA[] = [];

  const browser = await chromium.launch();
  try {
    for (const rol of roles) {
      const cuenta = await crearCuentaQA(rol);
      cuentas.push(cuenta);

      const page = await browser.newPage();
      await page.goto(`${baseURL}/login`);
      await page.locator('input[type="email"]').fill(cuenta.email);
      await page.locator('input[type="password"]').fill(cuenta.password);
      await page.locator('button[type="submit"]').first().click();
      await page.waitForURL((url) => !url.pathname.startsWith("/login"), { timeout: 15000 });
      await page.context().storageState({ path: path.join(DIR_AUTH, `${rol}.json`) });
      await page.close();
    }
  } finally {
    await browser.close();
  }

  writeFileSync(path.join(DIR_AUTH, "qa-accounts.json"), JSON.stringify(cuentas, null, 2));
}
