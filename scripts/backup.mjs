// Respaldo local de la base de datos y los archivos de Storage.
//
// No usa "supabase db dump" (pide Docker Desktop, que esta máquina no
// tiene) -- en su lugar exporta cada tabla y cada archivo por la API REST
// de Supabase, con la service_role key (se salta RLS a propósito, igual
// que los scripts de limpieza QA de tests/e2e/qaData.ts). Tablas y buckets
// se descubren en vivo (endpoint OpenAPI de PostgREST / listBuckets), así
// que nunca queda desactualizado si el esquema cambia.
//
// Junto con las migraciones ya versionadas en supabase/migrations/ (que
// definen la estructura completa), este respaldo es restaurable de
// verdad: proyecto Supabase nuevo -> correr las migraciones en orden ->
// volver a cargar estos JSON.
//
// Uso:
//   node scripts/backup.mjs            (respaldo diario normal)
//   node scripts/backup.mjs --mensual  (fuerza también una copia mensual)
//
// El día 1 de cada mes se guarda una copia mensual automáticamente, sin
// necesidad de la bandera.

import { createClient } from "@supabase/supabase-js";
import { readFileSync, mkdirSync, writeFileSync, renameSync, readdirSync, rmSync, statSync, appendFileSync } from "node:fs";
import path from "node:path";

const RAIZ = path.resolve(import.meta.dirname, "..");
const DIR_BACKUPS = path.join(RAIZ, "backups");
const RETENCION_DIARIA = 14;
const RETENCION_MENSUAL = 12;
const TAMANO_PAGINA = 1000;

function cargarEnvLocal() {
  const contenido = readFileSync(path.join(RAIZ, ".env.local"), "utf8");
  return Object.fromEntries(
    contenido
      .split("\n")
      .filter((l) => l.includes("=") && !l.trim().startsWith("#"))
      .map((l) => {
        const i = l.indexOf("=");
        return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
      }),
  );
}

async function descubrirTablas(url, key) {
  const res = await fetch(`${url}/rest/v1/`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
  });
  if (!res.ok) throw new Error(`No se pudo consultar el esquema (${res.status})`);
  const openapi = await res.json();
  return Object.keys(openapi.definitions ?? {}).sort();
}

async function exportarTabla(admin, nombre, dirDestino) {
  const filas = [];
  let desde = 0;
  for (;;) {
    const { data, error } = await admin
      .from(nombre)
      .select("*")
      .range(desde, desde + TAMANO_PAGINA - 1);
    if (error) throw new Error(`Tabla "${nombre}": ${error.message}`);
    filas.push(...(data ?? []));
    if (!data || data.length < TAMANO_PAGINA) break;
    desde += TAMANO_PAGINA;
  }
  writeFileSync(path.join(dirDestino, `${nombre}.json`), JSON.stringify(filas, null, 2));
  return filas.length;
}

// Storage.list() no es recursivo -- una "carpeta" es una entrada sin id.
async function listarArchivosRecursivo(admin, bucket, prefijo = "") {
  const { data, error } = await admin.storage.from(bucket).list(prefijo, { limit: 1000 });
  if (error) throw new Error(`Bucket "${bucket}" (${prefijo}): ${error.message}`);
  const archivos = [];
  for (const item of data ?? []) {
    const rutaCompleta = prefijo ? `${prefijo}/${item.name}` : item.name;
    if (item.id === null) {
      archivos.push(...(await listarArchivosRecursivo(admin, bucket, rutaCompleta)));
    } else {
      archivos.push(rutaCompleta);
    }
  }
  return archivos;
}

async function exportarBucket(admin, bucket, dirDestino) {
  const archivos = await listarArchivosRecursivo(admin, bucket);
  let bytesTotales = 0;
  for (const ruta of archivos) {
    const { data, error } = await admin.storage.from(bucket).download(ruta);
    if (error) throw new Error(`Descargando "${bucket}/${ruta}": ${error.message}`);
    const buffer = Buffer.from(await data.arrayBuffer());
    const destino = path.join(dirDestino, ruta);
    mkdirSync(path.dirname(destino), { recursive: true });
    writeFileSync(destino, buffer);
    bytesTotales += buffer.length;
  }
  return { archivos: archivos.length, bytes: bytesTotales };
}

function aplicarRetencion(dir, maximo) {
  if (!existeDir(dir)) return;
  const carpetas = readdirSync(dir)
    .filter((n) => /^\d{4}-\d{2}-\d{2}$/.test(n))
    .sort();
  const sobrantes = carpetas.slice(0, Math.max(0, carpetas.length - maximo));
  for (const nombre of sobrantes) {
    rmSync(path.join(dir, nombre), { recursive: true, force: true });
  }
}

function existeDir(p) {
  try {
    return statSync(p).isDirectory();
  } catch {
    return false;
  }
}

function copiarDirectorio(origen, destino) {
  mkdirSync(destino, { recursive: true });
  for (const entrada of readdirSync(origen, { withFileTypes: true })) {
    const rutaOrigen = path.join(origen, entrada.name);
    const rutaDestino = path.join(destino, entrada.name);
    if (entrada.isDirectory()) {
      copiarDirectorio(rutaOrigen, rutaDestino);
    } else {
      writeFileSync(rutaDestino, readFileSync(rutaOrigen));
    }
  }
}

function log(linea) {
  const marca = new Date().toISOString();
  mkdirSync(DIR_BACKUPS, { recursive: true });
  appendFileSync(path.join(DIR_BACKUPS, "backup.log"), `[${marca}] ${linea}\n`);
  console.log(linea);
}

async function main() {
  const inicio = Date.now();
  const env = cargarEnvLocal();
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const key = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Faltan NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY en .env.local");

  const admin = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
  const hoy = new Date().toISOString().slice(0, 10);

  const dirTmp = path.join(DIR_BACKUPS, `.tmp-${hoy}-${Date.now()}`);
  const dirDatos = path.join(dirTmp, "data");
  const dirStorage = path.join(dirTmp, "storage");
  mkdirSync(dirDatos, { recursive: true });
  mkdirSync(dirStorage, { recursive: true });

  const tablas = await descubrirTablas(url, key);
  const conteoTablas = {};
  for (const tabla of tablas) {
    conteoTablas[tabla] = await exportarTabla(admin, tabla, dirDatos);
  }

  const { data: buckets, error: errorBuckets } = await admin.storage.listBuckets();
  if (errorBuckets) throw new Error(`No se pudo listar los buckets: ${errorBuckets.message}`);
  const resumenBuckets = {};
  for (const bucket of buckets ?? []) {
    const dirBucket = path.join(dirStorage, bucket.id);
    mkdirSync(dirBucket, { recursive: true });
    resumenBuckets[bucket.id] = await exportarBucket(admin, bucket.id, dirBucket);
  }

  const manifiesto = {
    fecha: hoy,
    generado_en: new Date().toISOString(),
    tablas: conteoTablas,
    buckets: resumenBuckets,
    duracion_seg: Math.round((Date.now() - inicio) / 1000),
  };
  writeFileSync(path.join(dirTmp, "manifest.json"), JSON.stringify(manifiesto, null, 2));

  const dirDiario = path.join(DIR_BACKUPS, "diario");
  mkdirSync(dirDiario, { recursive: true });
  const destinoDiario = path.join(dirDiario, hoy);
  rmSync(destinoDiario, { recursive: true, force: true });
  renameSync(dirTmp, destinoDiario);
  aplicarRetencion(dirDiario, RETENCION_DIARIA);

  const esPrimeroDeMes = new Date().getDate() === 1;
  const forzarMensual = process.argv.includes("--mensual");
  if (esPrimeroDeMes || forzarMensual) {
    const dirMensual = path.join(DIR_BACKUPS, "mensual");
    mkdirSync(dirMensual, { recursive: true });
    const destinoMensual = path.join(dirMensual, hoy);
    rmSync(destinoMensual, { recursive: true, force: true });
    copiarDirectorio(destinoDiario, destinoMensual);
    aplicarRetencion(dirMensual, RETENCION_MENSUAL);
  }

  const totalFilas = Object.values(conteoTablas).reduce((a, b) => a + b, 0);
  const totalArchivos = Object.values(resumenBuckets).reduce((a, b) => a + b.archivos, 0);
  const totalBytes = Object.values(resumenBuckets).reduce((a, b) => a + b.bytes, 0);
  log(
    `OK diario ${hoy} -- ${tablas.length} tablas (${totalFilas} filas), ${totalArchivos} archivos de storage (${(totalBytes / 1024 / 1024).toFixed(1)} MB), ${manifiesto.duracion_seg}s${esPrimeroDeMes || forzarMensual ? " [+ copia mensual]" : ""}`,
  );
}

main().catch((err) => {
  log(`ERROR: ${err.message}`);
  process.exitCode = 1;
});
