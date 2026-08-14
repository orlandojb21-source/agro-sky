"use client";

import { useEffect, useRef, useState } from "react";
import {
  listarInformesCampoPendientes,
  eliminarInformeCampoPendiente,
  actualizarEstadoInformeCampoPendiente,
  type InformeCampoPendiente,
} from "@/lib/offlineInformesCampo";
import { sincronizarInformeCampoPendienteAction } from "@/lib/actions/informeCampoOffline";
import { formatDateOnly } from "@/lib/format";

// Vacía sola la cola de Informes de Campo guardados sin señal (ver
// offlineInformesCampo.ts / InformeCampoForm.tsx) apenas detecta conexión
// -- montado una sola vez en el layout general para que sincronice sin
// importar en qué pantalla esté el operador cuando recupera señal. Esto
// solo sucede mientras la app está abierta (no hay sincronización real en
// segundo plano con la app cerrada, iOS no lo permite de forma confiable
// en una PWA instalada) -- suficiente para el caso real: se llena el
// informe sin señal en el campo y se sube solo la próxima vez que se abre
// la app con señal.
export function SincronizadorInformesCampo() {
  const [pendientes, setPendientes] = useState<InformeCampoPendiente[]>([]);
  const [sincronizando, setSincronizando] = useState(false);
  const sincronizandoRef = useRef(false);

  async function refrescarLista() {
    try {
      setPendientes(await listarInformesCampoPendientes());
    } catch {
      // IndexedDB no disponible (ej. modo privado estricto) -- no bloquea el resto de la app.
    }
  }

  async function sincronizar() {
    if (sincronizandoRef.current || !navigator.onLine) return;
    sincronizandoRef.current = true;
    setSincronizando(true);
    try {
      const lista = await listarInformesCampoPendientes();
      for (const item of lista) {
        if (!navigator.onLine) break;

        await actualizarEstadoInformeCampoPendiente(item.id, "subiendo");
        await refrescarLista();

        const fd = new FormData();
        fd.append("cliente", item.datos.cliente);
        fd.append("tipoProyecto", item.datos.tipoProyecto);
        fd.append("proyectoId", item.datos.proyectoId);
        fd.append("fecha", item.datos.fecha);
        fd.append("finca", item.datos.finca);
        fd.append("horaInicio", item.datos.horaInicio);
        fd.append("horaFin", item.datos.horaFin);
        fd.append("meteorologia", item.datos.meteorologia);
        fd.append("tipoAplicacion", item.datos.tipoAplicacion);
        fd.append("modeloDrone", item.datos.modeloDrone);
        fd.append("dosisPorHectarea", String(item.datos.dosisPorHectarea));
        fd.append("jornada", item.datos.jornada);
        fd.append("operador", item.datos.operador);
        fd.append("ayudantes", JSON.stringify(item.datos.ayudantes));
        fd.append("nombreFirmaAgro", item.datos.nombreFirmaAgro);
        fd.append("nombreFirmaCliente", item.datos.nombreFirmaCliente);
        fd.append("parcelas", JSON.stringify(item.datos.parcelas));
        fd.append("productos", JSON.stringify(item.datos.productos));
        fd.append("imagenes", JSON.stringify(item.datos.imagenes));
        fd.append("firmaAgro", item.firmaAgroBlob, "firma-agro.png");
        fd.append("firmaCliente", item.firmaClienteBlob, "firma-cliente.png");

        try {
          const resultado = await sincronizarInformeCampoPendienteAction(fd);
          if (resultado.ok) {
            await eliminarInformeCampoPendiente(item.id);
          } else {
            await actualizarEstadoInformeCampoPendiente(item.id, "error", resultado.error);
          }
        } catch (err) {
          await actualizarEstadoInformeCampoPendiente(
            item.id,
            "error",
            err instanceof Error ? err.message : "No se pudo subir. Se reintentará.",
          );
        }
        await refrescarLista();
      }
    } finally {
      sincronizandoRef.current = false;
      setSincronizando(false);
    }
  }

  useEffect(() => {
    Promise.resolve()
      .then(refrescarLista)
      .then(sincronizar);
    function alRecuperarConexion() {
      sincronizar();
    }
    window.addEventListener("online", alRecuperarConexion);
    return () => window.removeEventListener("online", alRecuperarConexion);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function descartar(id: string) {
    await eliminarInformeCampoPendiente(id);
    await refrescarLista();
  }

  if (pendientes.length === 0) return null;

  return (
    <div className="mb-4 flex flex-col gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm dark:border-amber-900/40 dark:bg-amber-950/20">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="font-medium text-amber-800 dark:text-amber-200">
          {sincronizando
            ? "Subiendo informes de campo guardados sin señal..."
            : `${pendientes.length} informe(s) de campo guardado(s) en este celular, pendiente(s) de subir`}
        </span>
        {!sincronizando && (
          <button onClick={sincronizar} className="text-amber-700 hover:underline dark:text-amber-300">
            Reintentar ahora
          </button>
        )}
      </div>
      <ul className="flex flex-col gap-1">
        {pendientes.map((p) => (
          <li
            key={p.id}
            className="flex flex-wrap items-center justify-between gap-2 text-xs text-amber-800/80 dark:text-amber-200/80"
          >
            <span>
              {p.datos.cliente} — {formatDateOnly(p.datos.fecha)}
              {p.estado === "subiendo" && " — subiendo..."}
              {p.estado === "error" && ` — ${p.errorMensaje ?? "no se pudo subir, se reintentará"}`}
            </span>
            {p.estado !== "subiendo" && (
              <button
                onClick={() => descartar(p.id)}
                className="text-red-600 hover:underline dark:text-red-400"
              >
                Descartar
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
