import { existsSync, readFileSync, rmSync } from "node:fs";
import path from "node:path";
import { eliminarCuentaQA, limpiarDatosQA, type CuentaQA } from "./qaData";

const DIR_AUTH = path.resolve(__dirname, ".auth");

// Corre una vez al final de toda la suite (pase o falle) -- barre
// cualquier dato QA que haya quedado, borra las 3 cuentas QA creadas en
// global-setup, y borra los archivos de sesión guardados (nunca deben
// quedar en el repo, aunque ya estén en .gitignore).
//
// El orden importa: los datos primero, las cuentas después. Varias tablas
// (planilla_asistencia, informes_campo, etc.) tienen un "registrado_por"
// que referencia perfiles(id) SIN cascade -- si se borra la cuenta
// primero con esa fila todavía apuntándole, la eliminación falla por la
// restricción de llave foránea (en silencio, si no se revisa el error) y
// la cuenta queda huérfana para siempre.
export default async function globalTeardown() {
  await limpiarDatosQA();

  const rutaCuentas = path.join(DIR_AUTH, "qa-accounts.json");
  if (existsSync(rutaCuentas)) {
    const cuentas = JSON.parse(readFileSync(rutaCuentas, "utf8")) as CuentaQA[];
    for (const cuenta of cuentas) {
      await eliminarCuentaQA(cuenta);
    }
  }

  if (existsSync(DIR_AUTH)) {
    rmSync(DIR_AUTH, { recursive: true, force: true });
  }
}
