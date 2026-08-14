# Plan de Pruebas — Agro Sky Panamá

> Formato basado en el temario ISTQB (Fundamentos de Pruebas de Software).
> Alcance acordado con el cliente: **flujos críticos**, no cobertura
> completa de la aplicación — ver sección 4.

**Identificador del plan:** `AGRO-SKY-E2E-01`
**Versión:** 1.0 — 2026-08-01
**Suite:** `tests/e2e/` (Playwright, `@playwright/test`)

---

## 1. Objetivo

Verificar, mediante pruebas de sistema automatizadas de extremo a extremo
(E2E), que los flujos de mayor riesgo e impacto de negocio de la
aplicación funcionan correctamente después de cada cambio grande, sin
depender solo de pruebas manuales.

## 2. Elemento bajo prueba

La aplicación web Agro Sky (`agro-sky`), corriendo en modo desarrollo
local (`npm run dev`, `http://localhost:3000`) contra el proyecto real de
Supabase (los datos de prueba siempre llevan el prefijo `QA Suite` y se
borran automáticamente al terminar — nunca se toca un dato real).

## 3. Características a probar

| ID | Característica | Por qué es de alto riesgo |
|---|---|---|
| CP-AUTH | Autenticación y control de acceso por rol | Si falla, cualquier otra prueba de seguridad pierde sentido — es el cimiento de todo el sistema de permisos |
| CP-PLANILLA | Asistencia → Informe de Campo → Cálculo de pago | La lógica de negocio más compleja de la app (fórmula de incentivos por hectárea) — un error aquí significa pagarle mal a un colaborador |
| CP-INFORMES | Navegación de Informes (3 pestañas) + CRUD de Informe de Proyecto e Informe Diario | Sección reestructurada varias veces en la última sesión de trabajo — el mayor riesgo de regresión de rutas ahora mismo |
| CP-CAJA | Editar un movimiento de Caja Menuda registrado antes del desglose por billete/moneda | Prueba de regresión de un defecto real (2026-08-14): editar uno de esos movimientos le borraba el monto y descuadraba la caja en $34.80 — dinero desapareciendo del saldo sin ningún aviso |

## 4. Características que NO se prueban en esta versión

Por decisión explícita del cliente (cobertura de flujos críticos, no
cobertura completa), quedan fuera de esta primera versión de la suite:
Inventario, Bitácora, Caja Menuda, Compras, Ventas, Balance, y la gestión
completa de Usuarios (sí se prueba el *acceso* a la sección en CP-AUTH,
no el CRUD completo de usuarios). Se pueden agregar más adelante con el
mismo patrón ya establecido en `tests/e2e/`.

## 5. Enfoque y técnicas de diseño de casos

- **Partición de equivalencia**: sobre el estado de sesión
  (autenticado/no autenticado) y sobre el rol (administrador/jefe/soporte)
  contra las 2 secciones con reglas de acceso distintas (Usuarios,
  Balance) — se prueba un representante de cada partición, no cada
  combinación posible.
- **Prueba basada en escenario (workflow-based)**: CP-PLANILLA sigue un
  flujo real de principio a fin (registrar asistencia → informe de campo
  → calcular pago) en vez de probar cada pantalla de forma aislada,
  porque así es como falla en la vida real: un dato mal calculado en el
  paso 2 solo se nota en el resultado del paso 3.
- **Valor conocido verificado a mano**: CP-PLANILLA-03 no solo revisa que
  "salga un número" — compara contra el resultado exacto de la fórmula
  documentada (`30 + (20-15) × 1.5 = 37.50`), calculado independientemente
  de la aplicación.
- **Priorización basada en riesgo**: el orden de las características en
  la sección 3 es también el orden de prioridad — si hay que elegir qué
  correr primero (ej. tiempo limitado antes de un despliegue), CP-AUTH
  siempre va primero.

## 6. Ambiente de prueba

- Next.js en modo desarrollo (`npm run dev`), iniciado automáticamente
  por Playwright (`webServer` en `playwright.config.ts`) si no está ya
  corriendo.
- Supabase real (mismo proyecto de producción) — no hay un ambiente de
  pruebas separado todavía; el aislamiento se logra con datos con
  prefijo `QA Suite` y limpieza automática, nunca tocando filas sin ese
  prefijo.
- Navegador: Chromium (vía Playwright).

## 7. Criterios de entrada

- `npm install` corrido, dependencias instaladas.
- `.env.local` con las credenciales reales de Supabase (la suite las
  necesita para crear/borrar las cuentas y datos QA).
- El proyecto compila limpio (`npx tsc --noEmit`, `npm run lint`).

## 8. Criterios de salida

- Los 11 casos de prueba (`CP-AUTH-01..06`, `CP-PLANILLA-01..03`,
  `CP-INFORMES-01..03`, `CP-CAJA-01..02`) pasan en verde.
- Cero cuentas ni filas con prefijo `QA Suite` quedan en la base de datos
  después de correr la suite completa (lo verifica `global-teardown.ts`
  automáticamente).
- El reporte HTML (`playwright-report/`) no muestra fallas sin explicar.

## 9. Cómo correrla

```bash
npm run test:e2e          # corre toda la suite en la terminal
npm run test:e2e:ui       # modo interactivo (ver cada paso en vivo)
npm run test:e2e:report   # abre el último reporte HTML
```

## 10. Gestión de datos de prueba

- Toda cuenta y fila creada por la suite lleva el prefijo `QA Suite` en
  el campo que corresponda (nombre, cliente, proyecto, colaborador).
- `global-setup.ts` crea 3 cuentas (una por rol) una sola vez al
  principio de toda la corrida, y guarda su sesión ya iniciada
  (`tests/e2e/.auth/*.json`, nunca se sube al repositorio) para que los
  casos no repitan el login.
- `global-teardown.ts` borra esas 3 cuentas y barre cualquier fila que
  haya quedado con el prefijo `QA Suite`, corra o no corra bien la suite.
- Cada archivo de prueba, además, limpia sus propios datos en su
  `afterAll` — el barrido final es una red de seguridad extra, no la
  única limpieza.

## 11. Riesgos del propio plan de pruebas

| Riesgo | Mitigación |
|---|---|
| La suite corre contra el proyecto real de Supabase (no hay ambiente de pruebas separado) | Prefijo `QA Suite` obligatorio + limpieza automática en 2 capas (por archivo + global) |
| Recompilación de Turbopack en modo desarrollo puede introducir demoras/parpadeos que no son fallas reales de la app | Donde aplica, se verifica el resultado final contra la base de datos directamente (`expect.poll`), no solo contra lo que se ve en pantalla |
| `workers: 1` (la suite corre en serie) hace que sea más lenta | Aceptado a propósito: los datos QA se comparten entre specs, correr en paralelo arriesgaría condiciones de carrera entre pruebas |

## 12. Resumen de casos de prueba

| ID | Descripción |
|---|---|
| CP-AUTH-01 | Sin sesión, entrar al dashboard redirige a `/login` |
| CP-AUTH-02 | Login con credenciales inválidas muestra error |
| CP-AUTH-03 | Administrador no puede ver Usuarios |
| CP-AUTH-04 | Administrador no puede ver Balance |
| CP-AUTH-05 | Jefe sí puede ver Usuarios y Balance |
| CP-AUTH-06 | Administrador sí puede ver Planilla e Informes |
| CP-PLANILLA-01 | Registrar Asistencia de un día de Proyecto |
| CP-PLANILLA-02 | Registrar el Informe de Campo del mismo día (20 ha, con firmas) |
| CP-PLANILLA-03 | "Calcular pago sugerido" da el monto exacto esperado (37.50) |
| CP-INFORMES-01 | Las 3 pestañas navegan bien; rutas viejas devuelven 404 |
| CP-INFORMES-02 | Crear, ver y eliminar un Informe de Proyecto |
| CP-INFORMES-03 | Crear un Informe Diario vinculado a un Informe de Campo |
| CP-CAJA-01 | Cambiar solo la categoría de un movimiento antiguo conserva su monto ($35.00) y avisa del monto heredado |
| CP-CAJA-02 | Marcar billetes en ese mismo movimiento sí reemplaza el monto heredado (pasa a $20.00) |
