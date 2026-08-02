# Informe de Seguridad y Operación — Agro Sky Panamá

> Revisión manual del código y la configuración, con la mentalidad de un
> análisis estático de seguridad (estilo Checkmarx) mapeado contra las
> familias de controles de **ISO/IEC 27001-27002**, más recomendaciones de
> operación alineadas a **ITIL**. Fecha: 2026-08-01. Alcance: repositorio
> completo (`agro-sky`), configuración de Vercel/Supabase visible desde el
> código y las migraciones.
>
> **Este es un informe, no cambios aplicados.** Cada hallazgo tiene su
> severidad, dónde está, y cómo corregirlo — se corrigen uno por uno,
> cuando el usuario lo pida.

## Cómo leer esto

- 🔴 **Alto** — corregir pronto, es explotable o afecta disponibilidad/datos reales.
- 🟠 **Medio** — buena práctica que falta, riesgo real pero acotado.
- 🟡 **Bajo / informativo** — vale la pena saberlo, no es urgente.
- 🟢 **Bien hecho** — se revisó y está correcto; se documenta para que quede claro que no hace falta tocarlo.

---

## 1. Hallazgos de seguridad

### 🔴 1.1 Next.js 16.2.10 tiene varias vulnerabilidades conocidas de severidad alta

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

---

### 🟠 1.2 Las funciones `SECURITY DEFINER` de Postgres no fijan `search_path`

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

---

### 🟠 1.3 Las subidas de archivos no validan el tamaño máximo en el servidor

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

---

### 🟠 1.4 No hay cabeceras de seguridad configuradas

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

| Paquete | Severidad | Nota |
|---|---|---|
| `next` | Alta | Ver 1.1 arriba — prioridad principal |
| `brace-expansion` | Alta | Dependencia transitiva de herramientas de desarrollo (ESLint), no llega al código en producción — bajo riesgo real, se arregla solo con `npm audit fix` |
| `exceljs` (vía `uuid`) | Moderada | Se usa para exportar Excel — el aviso es sobre `uuid`, sin relación con los datos que exporta esta app; se puede posponer o resolver con `npm audit fix --force` (implica actualizar a una versión mayor de `exceljs`, revisar que el export de Excel se siga viendo igual después) |

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

| # | Hallazgo | Severidad | Esfuerzo de arreglo |
|---|---|---|---|
| 1.1 | Actualizar Next.js (vulnerabilidades conocidas) | 🔴 Alto | Bajo — 1 comando + reprobar |
| 1.3 | Límite de tamaño en subida de archivos | 🟠 Medio | Bajo — 3 archivos |
| 1.2 | `search_path` en funciones `security definer` | 🟠 Medio | Medio — 1 migración nueva, 19 funciones |
| 1.4 | Cabeceras de seguridad | 🟠 Medio | Bajo-Medio |
| Continuidad | Confirmar plan/respaldos de Supabase | 🔴 Alto (negocio) | Ninguno — solo revisar el dashboard |
| 1.5 / 1.6 | Ajustes de contraseña y rate-limit (Supabase dashboard) | 🟡 Bajo | Ninguno — son interruptores |

Cuando quieras, vamos corrigiendo uno por uno empezando por el 1.1 (Next.js) y la confirmación de respaldos de Supabase, que son los dos de mayor impacto real.
