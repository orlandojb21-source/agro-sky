# Informe de Seguridad y Operación — Agro Sky Panamá

> Revisión manual del código y la configuración, con la mentalidad de un
> análisis estático de seguridad (estilo Checkmarx) mapeado contra las
> familias de controles de **ISO/IEC 27001-27002**, más recomendaciones de
> operación alineadas a **ITIL**. Fecha: 2026-08-01. Alcance: repositorio
> completo (`agro-sky`), configuración de Vercel/Supabase visible desde el
> código y las migraciones.
>
> **Actualización 2026-08-02:** todos los hallazgos con código propio
> (1.1 a 1.4) ya se corrigieron y se verificaron (`tsc`, `lint`, `build`
> limpios + las 12 pruebas Playwright contra un navegador real, incluyendo
> las cabeceras de seguridad nuevas). Quedan pendientes solo los ajustes
> que se hacen desde el dashboard de Supabase (1.5, 1.6) y la confirmación
> del plan de respaldos (sección 3) — ninguno de los dos es código.
>
> **Actualización 2026-08-04:** rediseño completo del modelo de roles y
> permisos (ver 1.9) — de un modelo binario (acceso sí/no por sección) a
> uno de 3 niveles (ninguno/lectura/escritura), con 2 roles nuevos de
> solo lectura parcial o total. Verificado en 2 capas (servidor + UI) y
> desplegado en producción.
>
> **Actualización 2026-08-13:** revisión completa de todo lo construido
> desde la actualización anterior (Bitácora/drones, Mantenimiento,
> Balance, restricción de fechas, permisos de Campo) — ver 1.10. 3
> hallazgos reales, los 3 corregidos y verificados: límite de tamaño
> faltante en una subida de archivo, una vista de Postgres que se
> saltaba RLS, y una función `security definer` sin chequeo de
> autorización. De paso, `npm audit fix` (sin `--force`) resolvió 2
> avisos nuevos (`dompurify`, `nanoid`) sin cambios incompatibles.

## Cómo leer esto

- 🔴 **Alto** — corregir pronto, es explotable o afecta disponibilidad/datos reales.
- 🟠 **Medio** — buena práctica que falta, riesgo real pero acotado.
- 🟡 **Bajo / informativo** — vale la pena saberlo, no es urgente.
- 🟢 **Bien hecho** — se revisó y está correcto; se documenta para que quede claro que no hace falta tocarlo.
- ✅ **Corregido** — hallazgo ya resuelto en el código, con la fecha y qué se cambió.

---

## 1. Hallazgos de seguridad

### ✅ 1.1 Next.js 16.2.10 tenía varias vulnerabilidades conocidas de severidad alta — Corregido 2026-08-02

`npm audit` reporta que la versión instalada de `next` está dentro del
rango vulnerable de **9 avisos de seguridad publicados**, entre ellos:

- **Middleware/Proxy bypass en App Router con Turbopack** (`GHSA-6gpp-xcg3-4w24`) — relevante de forma directa: `src/proxy.ts` es el middleware que redirige a `/login` a cualquiera sin sesión, y este proyecto usa Turbopack (`next dev`/`next build` lo confirman en la consola). Si el bypass aplica a esta configuración, alguien podría llegar a una pantalla del dashboard sin haber iniciado sesión — la Row Level Security de Supabase seguiría bloqueando los *datos*, pero no debería depender de eso como única defensa.
- **Divulgación no autenticada de endpoints internos de Server Functions** (`GHSA-955p-x3mx-jcvp`).
- **SSRF en Server Actions** (`GHSA-89xv-2m56-2m9x`) y **Denegación de servicio en Server Actions** (`GHSA-m99w-x7hq-7vfj`) — este proyecto usa Server Actions en casi todos los módulos.
- Vulnerabilidades heredadas de dependencias internas de Next (`postcss`, `sharp`) usadas para procesar imágenes/estilos.

**Corrección:** `npm audit fix --force` instala `next@16.2.12` (dentro de
la misma rama 16, no es un salto de versión mayor). Después de actualizar:
`npx tsc --noEmit`, `npm run lint`, `npm run build`, y volver a probar el
login/navegación antes de desplegar.

**Referencia ISO 27002:** 8.8 (Gestión de vulnerabilidades técnicas).

**Corrección aplicada:** `package.json` actualizado a `next@^16.2.12` vía
`npm audit fix --force`, seguido de `npm install` para reconciliar el
lockfile. Verificado: `npx tsc --noEmit`, `npm run lint` y `npm run build`
limpios, y las 12 pruebas Playwright pasando contra la app ya
actualizada.

`npm audit fix --force` también intentó bajar `exceljs` de `^4.4.0` a
`^3.4.0` (para resolver un aviso moderado en `uuid`, una dependencia
interna de `exceljs`). Se investigó antes de aceptarlo: la última versión
4.x de `exceljs` (4.4.0, la más nueva que existe en esa rama) sigue
declarando `uuid: '^8.3.0'` — el mantenedor nunca subió esa dependencia
en la rama 4.x, así que el aviso **no se puede resolver quedándose en
ninguna versión 4.x**; la única forma de silenciarlo es bajar a una
versión mayor anterior (3.x), arriesgando romper las funciones de
exportar Excel (`exportarExcel`/`exportarServiciosExcel`) que sí
funcionan hoy, por un problema de baja explotabilidad real (la app nunca
pasa buffers controlados por el usuario a las llamadas internas de
`uuid` de `exceljs`). **Decisión:** se revirtió `exceljs` a `^4.4.0`
manualmente — se documenta como riesgo residual aceptado y monitoreado,
no ignorado.

De igual forma quedan, sin acción posible de nuestra parte, los avisos
de `postcss`/`sharp` **empaquetados dentro del propio `node_modules` de
Next.js** (no son una dependencia directa de este proyecto — son parte
del árbol interno de Next, y `npm audit fix --force` solo ofrece
resolverlos bajando a `next@9.3.3`, una versión de 2020 sin App Router).
Riesgo residual aceptado, a resolver solo cuando Next.js publique una
versión que actualice sus propias dependencias internas.

---

### ✅ 1.2 Las funciones `SECURITY DEFINER` de Postgres no fijaban `search_path` — Corregido 2026-08-02

Las 19 funciones `security definer` del esquema (`auth_tiene_perfil`,
`auth_gestiona_usuarios`, `crear_informe_campo`, `crear_informe_proyecto`,
etc.) no tienen un `set search_path = public` explícito, y varias
referencian tablas sin calificar el esquema (ej. `insert into
proyecto_informes (...)` en vez de `insert into public.proyecto_informes
(...)`). Esto es exactamente lo que el propio *linter* de Supabase marca
por defecto como "Function Search Path Mutable" (CWE-427).

**Por qué importa:** una función `security definer` corre con los
privilegios de quien la creó, pero resuelve nombres sin calificar según
el `search_path` de quien la *llama* — si ese search_path se puede
manipular, en teoría se podrían "secuestrar" referencias a tablas u
operadores.

**Corrección:** agregar `set search_path = public` a cada `create
function ... security definer` (una migración nueva con `create or
replace function` para cada una, sin cambiar su lógica).

**Referencia ISO 27002:** 8.28 (Codificación segura).

**Corrección aplicada:** `supabase/migrations/0054_fijar_search_path_funciones.sql`
— en vez de transcribir las 19 firmas a mano (riesgo real de un error de
tipeo rompiendo una función que sí funciona), un bloque `do $$ ... $$`
recorre `pg_proc`/`pg_namespace` y le aplica `alter function ... set
search_path = public` a cualquier función `security definer` del esquema
`public` que todavía no lo tenga — no toca el cuerpo de ninguna función,
es idempotente (se puede correr más de una vez sin efecto adicional).
Confirmado por el usuario que ya se corrió en el SQL Editor de Supabase;
las 12 pruebas Playwright (que ejercitan `crear_informe_campo`,
`crear_informe_proyecto`, `crear_asistencia`, etc. de punta a punta)
pasaron después de aplicada, confirmando que ninguna función quedó rota.

---

### ✅ 1.3 Las subidas de archivos no validaban el tamaño máximo en el servidor — Corregido 2026-08-02

`colaboradorFoto.ts`, `informeCampoFirma.ts` e `informeDiarioImagen.ts`
solo verifican que llegó *algo* (`archivo instanceof Blob`) antes de
subirlo a Storage. La compresión de imágenes (`comprimirImagen.ts`) pasa
por el navegador, así que **cualquier usuario autenticado que llame la
Server Action directamente** (sin pasar por el formulario) podría subir
un archivo de cualquier tamaño, sin límite — riesgo de agotar la cuota de
Storage o degradar el servicio para todos.

**Corrección:** agregar una verificación de tamaño explícita en cada una
de las 3 acciones antes de subir (ej. rechazar archivos de más de 5 MB
con un mensaje claro).

**Referencia ISO 27002:** 8.29 (Pruebas de seguridad en el desarrollo).

**Corrección aplicada:** nueva constante compartida
`src/lib/limitesArchivos.ts` (`TAMANO_MAXIMO_ARCHIVO_BYTES = 5 MB`),
usada en las 3 acciones (`colaboradorFoto.ts`, `informeCampoFirma.ts`,
`informeDiarioImagen.ts`) justo después de la validación existente de
`archivo instanceof Blob` — si el archivo pesa más de 5 MB, la acción
rechaza la subida con un mensaje claro antes de tocar Storage.

---

### ✅ 1.4 No había cabeceras de seguridad configuradas — Corregido 2026-08-02

`next.config.ts` no define ninguna cabecera de seguridad propia — no hay
`Content-Security-Policy`, `X-Frame-Options`, `X-Content-Type-Options`,
ni `Referrer-Policy`. Vercel agrega HTTPS/HSTS automáticamente, pero el
resto queda en los valores por defecto del navegador.

**Por qué importa:** sin `X-Frame-Options`/`frame-ancestors`, en teoría
la app se podría incrustar en un `<iframe>` de otro sitio (riesgo de
*clickjacking* — poco probable que alguien lo intente contra esta app
específica, pero es una protección barata de agregar).

**Corrección:** agregar un bloque `headers()` en `next.config.ts` con al
menos `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`,
`Referrer-Policy: strict-origin-when-cross-origin`, y una
`Content-Security-Policy` básica (empezar permisiva y endurecer con el
tiempo, ya que Supabase/Vercel necesitan varios orígenes permitidos).

**Referencia ISO 27002:** 8.20 (Seguridad de redes), 8.26 (Requisitos de seguridad de aplicaciones).

**Corrección aplicada, en dos partes:**

1. `next.config.ts` — cabeceras estáticas para toda respuesta:
   `Strict-Transport-Security` (2 años + subdominios + preload),
   `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`,
   `Referrer-Policy: strict-origin-when-cross-origin`, y
   `Permissions-Policy` bloqueando cámara/geolocalización/micrófono/pago/
   USB (la app no usa ninguno de esos APIs del navegador — se confirmó
   con una búsqueda en todo `src/` antes de bloquearlos).
2. `src/lib/supabase/middleware.ts` — `Content-Security-Policy` con un
   **nonce distinto por cada request**, en vez de `unsafe-inline` en
   `script-src` (que hubiera sido la salida fácil pero deja la puerta
   abierta a XSS vía inyección de scripts). Next.js App Router necesita
   ejecutar los `<script>` inline que inyecta para hidratar/streamear el
   contenido de los Server Components; el nonce se genera en el
   middleware (que ya corría en cada request para la sesión de Supabase)
   y Next.js lo detecta automáticamente con solo verlo en la cabecera CSP
   de la request entrante — confirmado en la práctica: el propio Next.js
   empezó a firmar con ese nonce sus cabeceras `Link` de precarga de
   fuentes. `style-src` sí permite `'unsafe-inline'` a propósito: Recharts
   (gráficas de Balance) escribe estilos inline en el SVG que genera en
   el navegador, y exigirle nonce ahí hubiera roto las gráficas — el
   riesgo real de permitir estilos inline (a diferencia de scripts
   inline) es mucho menor. `img-src`/`connect-src` incluyen el dominio de
   Supabase (fotos/firmas/capturas vía URL firmada + llamadas a la API).
   `'unsafe-eval'` se agrega a `script-src` **solo fuera de producción**
   (React en modo desarrollo lo pide para reconstruir stack traces al
   depurar; React mismo aclara que nunca lo usa en producción, así que
   restringirlo ahí no protege nada real).

   Verificado con `curl -D -` que las cabeceras llegan correctas en
   `/login`, y con las 12 pruebas Playwright corriendo contra un
   Chromium real (que hubiera fallado de inmediato si el CSP bloqueaba
   algún `fetch`, imagen, o el `<canvas>` de las firmas dibujadas) — las
   12 pasaron sin cambios de comportamiento.

   De paso, correr la suite reveló que la actualización de Next.js (1.1)
   agregó un indicador flotante de "Dev Tools" (solo visible en `next
   dev`, nunca en producción) que tapaba el botón "Guardar informe" al
   fondo de formularios largos — se reposicionó con `devIndicators:
   { position: "top-right" }` en `next.config.ts`. No es un hallazgo de
   seguridad, se documenta aquí porque se descubrió en esta misma
   verificación.

   **Incidente real en producción y corrección (2026-08-02, minutos
   después del despliegue anterior):** el usuario reportó que no podía
   iniciar sesión. Las 12 pruebas Playwright habían pasado en local, pero
   **`next dev`/`next build && next start` nunca reproducen el
   comportamiento real de caché de Vercel** — ahí estaba el hueco. Cuatro
   páginas (`/`, `/login`, `/actualizar-password`, `/unauthorized`) son
   prerenderizadas y Vercel sirve ese HTML desde su caché de CDN; el
   nonce que trae ese HTML cacheado quedaba fijo desde que se generó,
   mientras que el middleware genera un nonce **nuevo en cada request**
   para la cabecera CSP — nunca coinciden, y el navegador bloquea todos
   los scripts de la página (cero interactividad: el botón "Entrar" del
   login no hacía nada). Confirmado en vivo con un script Playwright +
   una cuenta QA desechable contra `agroskypty.app` real, no solo
   local — mostró decenas de errores `Refused to execute inline script /
   Refused to load script` en consola. Corrección: esas 4 páginas se
   separaron en un Server Component con `export const dynamic =
   "force-dynamic"` (Next.js solo respeta ese export en Server
   Components, no en archivos `"use client"`) más un Client Component
   colocado con la lógica original intacta (`LoginForm.tsx`,
   `SplashScreen.tsx`, `ActualizarPasswordForm.tsx`) — esto obliga a
   Next.js a renderizar esas páginas de nuevo en cada request, así el
   nonce del HTML y el de la cabecera CSP siempre coinciden. Reverificado
   igual, en vivo contra producción tras el segundo despliegue: login
   exitoso, cero errores de CSP en consola. **Lección para cualquier CSP
   con nonce en Next.js App Router futura**: verificar directamente
   contra el despliegue real (no solo `next dev`/`next start` local) en
   cualquier ruta que pueda quedar prerenderizada/cacheada.

---

### ✅ 1.9 Rediseño de roles: modelo de 3 niveles (lectura/escritura) por sección — Implementado 2026-08-04

Hasta esta fecha, `SECTION_ACCESS` (`src/lib/roles.ts`) era un modelo
binario: `Record<Seccion, Rol[]>` — o un rol tenía acceso completo a una
sección, o no tenía ninguno. No existía el concepto de "solo lectura".
El usuario pidió reestructurar los roles de la empresa a 6, dos de ellos
de solo lectura (parcial o total):

| Rol interno (sin cambios en BD) | Etiqueta | Acceso |
|---|---|---|
| `jefe` | Gerente General | Escritura en todo (sin cambios) |
| `soporte` | Soporte IT | Escritura en todo (sin cambios) |
| `administrador` | Administrador | Sin cambios |
| `campo` | Campo | Escritura en Informe de Campo (**crear, no editar/eliminar**) y Bitácora |
| `gerente` (**nuevo**) | Gerente | Solo lectura en las 9 secciones, sin excepción |
| `rrhh_contabilidad` (**nuevo**) | Recursos Humanos y Contabilidad | Escritura en Planilla/Caja Menuda/Compras/Balance, lectura en el resto |

**Modelo nuevo:** `SECTION_ACCESS: Record<Seccion, Record<Rol, NivelAcceso>>`
con `NivelAcceso = "ninguno" | "lectura" | "escritura"`. `canAccess()`
mantiene su firma/comportamiento de siempre; `canWrite()` es nuevo.

**Enforcement en 2 capas, ambas verificadas por separado** (decisión
explícita del usuario — no bastaba con esconder botones):

1. **Servidor**: nuevo helper `requireWrite(seccion)` en `lib/session.ts`,
   usado al inicio de las **72 funciones mutadoras** en los 21 archivos
   de `lib/actions/`. Verificado con cuentas QA reales haciendo clics
   reales en el navegador (no solo llamadas directas a la Server
   Action) — ej. confirmado que `gerente` cae en `/unauthorized` al
   intentar crear un gasto, y que la fila nunca llega a la base de
   datos.
2. **UI**: las ~35 páginas de lista/detalle/formulario esconden los
   botones de crear/editar/eliminar cuando `canWrite()` es falso, y cada
   ruta `nuevo`/`editar` cambia su gate de `requireSection` a
   `requireWrite` (si alguien escribe la URL a mano, cae en
   `/unauthorized` igual que si hubiera llamado la Server Action
   directo). Verificado con 23 chequeos automatizados (Playwright +
   cuentas QA desechables) tanto en local como contra producción
   (`agroskypty.app`).

**Excepción de Campo en Informe de Campo** (crear sí, editar/eliminar
no): no cabe en el modelo genérico de 2 niveles, así que
`editarInformeCampoAction`/`eliminarInformeCampoAction` agregan un
chequeo puntual (`if (perfil.rol === "campo") redirect("/unauthorized")`)
después de `requireWrite("informes")`, con el mismo chequeo repetido en
la página `informes/campo/[id]/editar/page.tsx` para que la ruta
tampoco sea alcanzable a mano.

**Alcance explícito de este cambio — RLS de Postgres quedó fuera**, con
**una única excepción, acotada y documentada**: el candado existente de
"solo jefe/soporte gestionan pagos de colaboradores Fijos" vivía en RLS
desde antes (migraciones `0034`/`0049`), no en la app. Extenderlo a
`rrhh_contabilidad` (pedido explícito del usuario) requería tocar RLS
sí o sí. En vez de reusar/ampliar `auth_gestiona_usuarios()` (que
también protege Usuarios, y `rrhh_contabilidad` **no** debe tener
escritura ahí), se creó una función nueva y angosta,
`auth_gestiona_pagos_fijos()` (migración
`0060_rrhh_contabilidad_pagos_fijos.sql`), usada en 3 políticas
aditivas nuevas sobre `planilla_pagos` — sin tocar las políticas
existentes de jefe/soporte. El resto del sistema sigue con
`auth_tiene_perfil()` en RLS (cualquier perfil válido, sin distinguir
rol), exactamente como antes — el candado real para todo lo demás vive
en la capa de aplicación (los 2 puntos de arriba), riesgo residual
aceptado igual que ya estaba documentado antes de este cambio.

**Referencia ISO 27002:** 8.2 (Derechos de acceso privilegiado), 5.15
(Control de acceso), 8.3 (Restricción de acceso a la información).

**Verificado:** `tsc`/`lint`/`build` limpios; las 12 pruebas Playwright
existentes siguen pasando sin cambios; 23 chequeos nuevos con 3 cuentas
QA desechables (`gerente`, `rrhh_contabilidad`, `campo`) confirmando
tanto el bloqueo de servidor como el ocultamiento de UI, repetidos
contra producción tras cada despliegue. Commits `edbb48c` (Fase A+B:
modelo + bloqueo de servidor) y `c6b2f86` (Fase C: UI).

---

### ✅ 1.10 Revisión completa de todo lo construido desde el 2026-08-04 — Corregido 2026-08-13

Auditoría exhaustiva (3 agentes en paralelo + revisión manual del
núcleo de autenticación) de todo lo que se agregó después de la
actualización anterior: Bitácora (drones/vuelos/mantenimiento), Balance,
la restricción de fecha por rol, y el ajuste de permisos de Campo.
Alcance: las 29 Server Actions de `src/lib/actions/`, las 22 migraciones
más nuevas (`0061` a `0082`), y una nueva pasada completa por
inyección/XSS/subida de archivos en todo `src/`.

**Sin puertas traseras** — las 29 Server Actions mutadoras siguen sin
excepción el patrón `requireWrite`/`requireSection` (más el chequeo de
rol angosto cuando aplica, ej. `puedeGestionarDrones`) antes de tocar la
base de datos. `middleware`/`proxy.ts`, `session.ts`, `perfil.ts` y
`admin.ts` (aislamiento de la `service_role` key) se revisaron a mano,
sin regresión frente a lo documentado en 1.1-1.4.

Se encontraron y corrigieron **3 hallazgos reales**:

1. 🟠 **`informeCampoOffline.ts` sin límite de tamaño de archivo** — la
   acción de sincronización de Informes de Campo llenados sin señal
   (`sincronizarInformeCampoPendienteAction`) subía las 2 firmas a
   Storage validando solo `instanceof Blob`, sin el límite de 5MB
   (`TAMANO_MAXIMO_ARCHIVO_BYTES`) que sí tienen las otras 6 acciones de
   subida de archivo — mismo vector que el hallazgo 1.3 original, que se
   quedó fuera de esta acción por ser una ruta de código separada
   (sincronización en segundo plano, no un `<form>` normal). Corregido
   agregando el mismo chequeo.

2. 🔴 **Vista `drones_mantenimientos_preventivos_estado` se saltaba RLS**
   (migración `0077`) — se creó sin `security_invoker = true`. Por
   defecto en Postgres, una vista corre con los permisos de su *dueño*
   (quien la creó), no con los de quien la consulta — como el dueño
   también es dueño de `drones` y `drones_mantenimientos_preventivos`,
   la vista se saltaba la política RLS `auth_tiene_perfil()` de esas 2
   tablas. Cualquier sesión autenticada (JWT válido de Supabase Auth
   para este proyecto), **incluso una sin fila en `perfiles`**, podía
   leer todas las filas de la vista llamando la API de Supabase directo
   (sin pasar por las páginas de la app, que sí bloquean a un usuario
   sin perfil). Corregido con `alter view ... set (security_invoker =
   true)` (migración `0083`) — verificado en vivo contra producción
   creando una cuenta de prueba autenticada sin perfil: antes del fix
   traía todas las filas, después trae 0.

3. 🟠 **`recalcular_cadena_vuelo_drone` sin chequeo de autorización**
   (migración `0076`) — a diferencia de sus 3 funciones hermanas del
   mismo archivo (`registrar_vuelo_drone`, `editar_registro_vuelo_drone`,
   `eliminar_registro_vuelo_drone`), esta no verificaba
   `auth_tiene_perfil()` antes de mutar `drones_vuelos`/`drones` —
   cualquier sesión autenticada podía invocarla directo con un
   `drone_id` arbitrario. Impacto acotado (solo recalcula de forma
   determinista a partir de datos ya existentes, no permite inyectar
   valores), pero rompía el patrón de autorización sin excepción del
   resto del esquema. Corregido agregando el mismo chequeo que sus
   funciones hermanas (migración `0083`) — verificado en vivo: la misma
   cuenta de prueba sin perfil ahora recibe `"No autorizado"` en vez de
   ejecutar la función.

**Hallazgo menor, sin corrección de código** (migración `0068`,
documentado en el propio comentario de esa migración): `caja_gastos` y
`gastos` perdieron su restricción `check` de categoría al pasar a una
lista administrable (`categorias_gasto`) — la validación ahora vive solo
en el servidor (`categoriaGastoValida()`, verificado que se llama antes
de cada insert/update). Es un riesgo de integridad de datos, no de
acceso — no requiere acción mientras esa validación siga presente en
cada Server Action que la usa.

**De paso**, `npm audit` reportó 2 avisos nuevos desde el 2026-08-02
(`dompurify`, vía `jspdf`; `nanoid`, vía `postcss`/Tailwind) — `npm
audit fix` (sin `--force`) los resolvió sin ningún cambio incompatible
(solo tocó `package-lock.json`, ninguna versión declarada en
`package.json` cambió). Quedan los mismos 2 riesgos residuales ya
documentados y aceptados en 1.1 (`postcss`/`sharp` empaquetados dentro
de `next`, `uuid` vía `exceljs`) — sin cambios en su estado.

**Referencia ISO 27002:** 8.28 (Codificación segura), 8.29 (Pruebas de
seguridad en el desarrollo), 8.8 (Gestión de vulnerabilidades técnicas).

**Verificado:** `tsc`/`lint`/`build` limpios; los 2 fixes de base de
datos verificados en vivo contra producción con una cuenta de prueba
autenticada sin perfil (antes/después de cada fix); las 12 pruebas
Playwright pasando (una de ellas, `CP-INFORMES-02`, se ajustó porque el
`npm audit fix` subió Next.js de `16.2.12` a `16.3.0` dentro del mismo
rango declarado, lo que cambió el timing del anunciador de rutas para
lectores de pantalla y dejó un selector de la prueba demasiado genérico
— no relacionado con ningún hallazgo de seguridad, solo una prueba que
había que hacer más específica).

---

### 🟡 1.5 Política de contraseñas mínima (8 caracteres, sin verificación de filtraciones)

`usuarioCreateSchema`/`usuarioPasswordSchema` exigen 8 caracteres, sin
regla de complejidad — que es lo que recomienda NIST 800-63B (la
longitud importa más que forzar símbolos), pero vale la pena:

1. Confirmar que en el panel de Supabase (**Authentication → Policies /
   Password**) esté activada la opción de "Leaked password protection"
   (verifica contra bases de contraseñas filtradas conocidas — es un
   interruptor, no requiere código).
2. Considerar subir el mínimo a 10-12 caracteres para las cuentas de
   `administrador`/`jefe`/`soporte`, ya que son cuentas con acceso a
   datos operativos y financieros de la empresa completa.

**Referencia ISO 27002:** 5.17 (Información de autenticación).

---

### 🟡 1.6 Sin límite de intentos de inicio de sesión a nivel de la app

No hay bloqueo de cuenta ni CAPTCHA después de varios intentos fallidos
en `login/page.tsx`. Supabase Auth aplica *su propio* límite de tasa a
nivel de plataforma (esto no es una vulnerabilidad activa), pero vale la
pena confirmar en el dashboard de Supabase (**Authentication →
Rate Limits**) que esos valores por defecto sean adecuados para el uso
real de la app.

**Referencia ISO 27002:** 8.5 (Autenticación segura).

---

### 🟢 1.7 El desbloqueo con huella/rostro está bien delimitado (aclaración, no falla)

`lib/webauthn.ts` está documentado explícitamente en su propio código
como un candado *local* de conveniencia (igual que el "desbloqueo rápido"
de una app bancaria) — no reemplaza ni reautentica contra Supabase, no
hay verificación de servidor de por medio. El control de acceso real
sigue siendo la sesión de Supabase (cookie + JWT), verificada en cada
solicitud por el middleware y por RLS. Se documenta aquí para que quede
explícito en un informe formal y nunca se confunda con un segundo factor
de autenticación real.

---

### 🟢 1.8 Lo que ya está bien hecho (verificado, no hace falta tocar)

- **RLS activo en las 53 tablas del esquema, sin excepción** — se comparó
  cada `create table` contra cada `alter table ... enable row level
  security` y no falta ninguna.
- **Cero permisos otorgados a `anon`** — un usuario sin sesión no puede
  leer ni escribir ninguna tabla, en ningún módulo.
- **Cero políticas `using (true)`** y **cero políticas `for all` sin su
  `with check`** correspondiente — no hay una sola política
  "todo permitido" en todo el esquema.
- **El patrón de políticas aditivas está aplicado de forma consistente**
  (una política amplia para jefe/soporte + una más angosta con `exists
  (...)` para el resto) en vez de intentar meter toda la regla en una
  sola política — así es más fácil de auditar y menos propenso a errores.
- **La `service_role` key (que se salta RLS) solo se usa en un lugar**:
  `lib/actions/usuarios.ts`, siempre detrás de `requireSection("usuarios")`
  primero — y `lib/supabase/admin.ts` está protegido con el paquete
  `server-only`, que hace fallar el *build* si algún día alguien la
  importa sin querer desde código que corre en el navegador.
- **Validación con `zod` en cada Server Action**, sin excepciones —
  ningún dato de un formulario llega a la base de datos sin pasar por un
  esquema tipado primero.
- **Cero `dangerouslySetInnerHTML`, `eval` o `.innerHTML`** en todo el
  código — React ya protege contra XSS por defecto, y no se rompió esa
  protección en ningún lado.
- **Los buckets de Storage son privados** (`colaboradores-fotos`,
  `informes-campo-firmas`, `informes-diarios-capturas`) y solo se
  acceden vía URLs firmadas de 1 hora generadas en el servidor — nunca
  una URL pública permanente.
- **Protección contra inyección de fórmulas en Excel** (`celdaSegura()`
  en `lib/exportar.ts`) aplicada a todo texto libre exportado.
- **`.env*` está en `.gitignore`**, nunca se subió una credencial real al
  repositorio.
- **Sin riesgo de inyección vía filtros de PostgREST** — se evitó a
  propósito construir filtros `.or()` con texto interpolado directamente
  (confirmado también en los comentarios del propio código).
- **Las funciones RPC exigen sesión real incluso llamadas con la
  `service_role` key**: se confirmó de forma directa al construir la
  suite de pruebas (`tests/e2e/`) — `crear_informe_campo`,
  `eliminar_informe_campo`, etc. verifican `auth_tiene_perfil()`, que
  depende de `auth.uid()` (el usuario autenticado real); un script que se
  conecta solo con la `service_role` key, sin haber iniciado sesión como
  alguien, recibe `"No autorizado"` igual que cualquier otro. La
  `service_role` key sí salta la Row Level Security en operaciones
  directas de tabla (`insert`/`update`/`delete`), pero **no** salta la
  lógica de autorización que estas funciones verifican explícitamente en
  su propio código — una capa extra de defensa que no dependía de RLS.
- **Renombrado correcto de una función `security definer`** (migración
  `0004`, `auth_es_administrador` → `auth_gestiona_usuarios`): Postgres
  liga las políticas RLS a la función por identidad, no por nombre, así
  que el renombrado no rompió ninguna política — y el *trigger* que sí
  necesitaba actualizarse a mano (porque resuelve nombres en texto) se
  actualizó correctamente en la misma migración. Buena disciplina de
  ingeniería, vale la pena que quede documentado.

---

## 2. Otras dependencias con avisos de `npm audit`

Estado tras la corrección de 1.1 (`npm audit` corrido de nuevo el
2026-08-02):

| Paquete | Severidad | Estado |
|---|---|---|
| `next` | Alta | ✅ Corregido — ver 1.1 |
| `brace-expansion` | Alta | ✅ Corregido — desapareció del audit tras el `npm install` de 1.1 (era transitiva de ESLint, nunca llegaba a producción) |
| `postcss` / `sharp` | Alta | ⚠️ Residual aceptado — empaquetadas dentro del propio `node_modules/next`, no son dependencia directa de este proyecto; la única corrección que ofrece `npm audit fix --force` es bajar a `next@9.3.3` (2020, sin App Router) — ver nota completa en 1.1 |
| `exceljs` (vía `uuid`) | Moderada | ⚠️ Residual aceptado y monitoreado — decisión razonada en 1.1, ninguna versión 4.x de `exceljs` resuelve el aviso |

---

## 3. Recomendaciones de operación (ITIL, ajustadas al tamaño real de esta app)

No se necesita montar un proceso ITIL completo para una app interna de
una sola empresa — estas son las prácticas que sí valen la pena, en
proporción:

- **Gestión de cambios**: ya existe una base sólida (cada cambio de base
  de datos es una migración numerada y versionada en `supabase/migrations/`,
  aplicada solo después de confirmación explícita). Lo único que falta es
  un **CHANGELOG.md** corto con fecha + resumen de cada despliegue
  importante, para no depender solo del historial de git al buscar "¿qué
  cambió la semana pasada?".
- **Gestión de incidentes / problemas conocidos**: no existe un
  documento en el repo con "si pasa X, se hace Y" — por ejemplo, el
  servidor de desarrollo en Windows a veces se cae por un problema
  conocido de Turbopack (ya lo resolví varias veces esta sesión con el
  mismo remedio). Vale la pena un `KNOWN_ISSUES.md` corto con estos
  casos y su solución, para que no dependa solo de que yo lo recuerde.
- **Continuidad del servicio / respaldos**: **esto sí es importante
  confirmar pronto** — hay que verificar en el dashboard de Supabase qué
  plan tiene el proyecto y qué nivel de respaldo automático incluye (los
  planes gratuitos de Supabase típicamente no incluyen recuperación a un
  punto en el tiempo). Si toda la información de la empresa (planilla,
  ventas, informes) vive solo en ese proyecto sin respaldo, es el
  hallazgo de continuidad de negocio más importante de este informe,
  aunque no sea un "hallazgo de código".
- **Gestión de versiones/despliegues**: no hay ningún control automático
  (CI) que impida subir código roto a producción — hoy la única
  protección es que yo corro `tsc`/`lint`/`build` a mano antes de cada
  `git push`. La suite de Playwright que se arma a continuación (punto
  4) es el primer paso real hacia poder automatizar esa verificación.
- **Gestión de capacidad**: Vercel (plan Hobby) y Supabase tienen límites
  de uso (ancho de banda, tiempo de ejecución, tamaño de base de datos y
  Storage). Ahora que la app ya guarda fotos, firmas y capturas en
  Storage, vale la pena revisar esos límites cada tanto a medida que
  crece el uso real, para no encontrarse con un límite alcanzado sin
  aviso.

---

## 4. Resumen de prioridades

| # | Hallazgo | Severidad | Estado |
|---|---|---|---|
| 1.1 | Actualizar Next.js (vulnerabilidades conocidas) | 🔴 Alto | ✅ Corregido 2026-08-02 |
| 1.3 | Límite de tamaño en subida de archivos | 🟠 Medio | ✅ Corregido 2026-08-02 |
| 1.2 | `search_path` en funciones `security definer` | 🟠 Medio | ✅ Corregido 2026-08-02 |
| 1.4 | Cabeceras de seguridad (incl. CSP con nonce) | 🟠 Medio | ✅ Corregido 2026-08-02 |
| 1.9 | Rediseño de roles: 3 niveles (lectura/escritura) por sección | — (control de acceso) | ✅ Implementado 2026-08-04 |
| 1.10 | Vista `drones_mantenimientos_preventivos_estado` se saltaba RLS | 🔴 Alto | ✅ Corregido 2026-08-13 |
| 1.10 | `recalcular_cadena_vuelo_drone` sin chequeo de autorización | 🟠 Medio | ✅ Corregido 2026-08-13 |
| 1.10 | `informeCampoOffline.ts` sin límite de tamaño de archivo | 🟠 Medio | ✅ Corregido 2026-08-13 |
| Continuidad | Confirmar plan/respaldos de Supabase | 🔴 Alto (negocio) | ⏳ Pendiente — solo revisar el dashboard, no es código |
| 1.5 / 1.6 | Ajustes de contraseña y rate-limit (Supabase dashboard) | 🟡 Bajo | ⏳ Pendiente — son interruptores, no es código |

Lo único que queda de todo este informe son los 3 puntos marcados
⏳ arriba — ninguno requiere cambios de código, se hacen desde el
dashboard de Supabase cuando el usuario los revise.
