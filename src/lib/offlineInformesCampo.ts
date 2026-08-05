"use client";

// Cola local (IndexedDB) de Informes de Campo llenados sin señal -- el
// operador llena el formulario y dibuja las firmas normalmente, pero si no
// hay conexión al guardar, todo (datos + las 2 firmas como PNG) se guarda
// aquí en el propio celular en vez de perderse con un error de red.
// SincronizadorInformesCampo.tsx vacía esta cola solo, apenas detecta
// conexión de nuevo -- ver ese archivo para la subida real.
//
// IndexedDB (no localStorage) porque necesita guardar las firmas como
// Blob -- localStorage solo guarda texto y tiene un límite de ~5-10MB,
// muy poco para varias firmas dibujadas.

const DB_NAME = "agro-sky-offline";
const DB_VERSION = 1;
const STORE = "informes_campo_pendientes";

export type DatosInformeCampoPendiente = {
  cliente: string;
  fecha: string;
  finca: string;
  horaInicio: string;
  horaFin: string;
  meteorologia: string;
  modeloDrone: string;
  dosisPorHectarea: string;
  tipoProyecto: "ingenio_santa_rosa" | "particular";
  operador: string;
  ayudantes: string[];
  nombreFirmaAgro: string;
  nombreFirmaCliente: string;
  parcelas: { numeroParcela: string; hectareas: number }[];
  productos: { productoActivo: string; ltsPorHectarea: number }[];
};

export type InformeCampoPendiente = {
  id: string;
  creadoEn: string;
  datos: DatosInformeCampoPendiente;
  firmaAgroBlob: Blob;
  firmaClienteBlob: Blob;
  estado: "pendiente" | "subiendo" | "error";
  errorMensaje?: string;
};

function abrirDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "id" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function guardarInformeCampoPendiente(
  datos: DatosInformeCampoPendiente,
  firmaAgroBlob: Blob,
  firmaClienteBlob: Blob,
): Promise<string> {
  const db = await abrirDB();
  const id = crypto.randomUUID();
  const registro: InformeCampoPendiente = {
    id,
    creadoEn: new Date().toISOString(),
    datos,
    firmaAgroBlob,
    firmaClienteBlob,
    estado: "pendiente",
  };
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(registro);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
  return id;
}

export async function listarInformesCampoPendientes(): Promise<InformeCampoPendiente[]> {
  const db = await abrirDB();
  const registros = await new Promise<InformeCampoPendiente[]>((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).getAll();
    req.onsuccess = () => resolve(req.result as InformeCampoPendiente[]);
    req.onerror = () => reject(req.error);
  });
  db.close();
  return registros.sort((a, b) => a.creadoEn.localeCompare(b.creadoEn));
}

export async function actualizarEstadoInformeCampoPendiente(
  id: string,
  estado: InformeCampoPendiente["estado"],
  errorMensaje?: string,
): Promise<void> {
  const db = await abrirDB();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    const store = tx.objectStore(STORE);
    const req = store.get(id);
    req.onsuccess = () => {
      const registro = req.result as InformeCampoPendiente | undefined;
      if (registro) {
        registro.estado = estado;
        registro.errorMensaje = errorMensaje;
        store.put(registro);
      }
    };
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

export async function eliminarInformeCampoPendiente(id: string): Promise<void> {
  const db = await abrirDB();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}
