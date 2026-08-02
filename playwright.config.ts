import { defineConfig, devices } from "@playwright/test";

// Suite de pruebas de sistema (E2E) para los flujos críticos de Agro Sky --
// ver tests/TEST_PLAN.md para el alcance, la técnica de diseño de casos y
// los criterios de entrada/salida (formato ISTQB).
//
// Corre contra un servidor local (npm run dev) apuntando al mismo proyecto
// de Supabase real -- toda la suite crea y borra sus propios datos con
// prefijo "QA", nunca toca datos reales del cliente.
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false, // los datos QA se comparten entre specs -- correr en serie evita condiciones de carrera
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [["list"], ["html", { open: "never", outputFolder: "playwright-report" }]],
  globalSetup: "./tests/e2e/global-setup.ts",
  globalTeardown: "./tests/e2e/global-teardown.ts",
  use: {
    baseURL: "http://localhost:3000",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
