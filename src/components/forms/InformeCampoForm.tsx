"use client";

import { useRef, useState, useSyncExternalStore } from "react";
import { useActionState } from "react";
import { crearInformeCampoAction, editarInformeCampoAction } from "@/lib/actions/informesCampo";
import { subirFirmaInformeCampoAction } from "@/lib/actions/informeCampoFirma";
import { informeCampoSchema } from "@/lib/validation/informesCampo";
import { guardarInformeCampoPendiente } from "@/lib/offlineInformesCampo";
import { Field, SelectField } from "@/components/ui/Field";
import { FormError } from "@/components/ui/FormError";
import { FirmaCanvas } from "@/components/ui/FirmaCanvas";
import { SubmitButton, LinkButton } from "@/components/ui/Button";

const CLASE_INPUT =
  "w-full rounded-lg border border-green-200 bg-white px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-600 dark:border-green-800 dark:bg-green-950/30";

// Valor que queda en el <input hidden> de una firma cuando se dibujó sin
// señal (ver subirFirmaAgro/subirFirmaCliente) -- no es una ruta real de
// Storage, solo marca "esta firma todavía no se subió". Se usa para decidir
// si el envío completo debe guardarse local en vez de intentar ir a red.
const SIN_CONEXION = "pendiente-sin-conexion";

// Suscripción al estado de conexión del navegador vía useSyncExternalStore
// (el hook pensado justo para esto: leer una fuente externa mutable, sin
// el "setState síncrono dentro de un efecto" que causa renders en cascada)
// -- "true" en el servidor porque ahí no existe navigator, se corrige solo
// apenas React hidrata en el cliente.
function suscribirseConexion(callback: () => void) {
  window.addEventListener("online", callback);
  window.addEventListener("offline", callback);
  return () => {
    window.removeEventListener("online", callback);
    window.removeEventListener("offline", callback);
  };
}
function leerConexionCliente() {
  return navigator.onLine;
}
function leerConexionServidor() {
  return true;
}

type ParcelaDraft = { numeroParcela: string; hectareas: string };
type ProductoDraft = { productoActivo: string; ltsPorHectarea: string };

function parcelaVacia(): ParcelaDraft {
  return { numeroParcela: "", hectareas: "" };
}
function productoVacio(): ProductoDraft {
  return { productoActivo: "", ltsPorHectarea: "" };
}

export type ValoresInformeCampo = {
  id: string;
  cliente: string;
  fecha: string;
  finca: string;
  horaInicio: string;
  horaFin: string;
  meteorologia: string;
  modeloDrone: string;
  dosisPorHectarea: string;
  operador: string;
  ayudantes: string[];
  firmaAgroRuta: string | null;
  nombreFirmaAgro: string | null;
  firmaAgroUrl: string | null;
  firmaClienteRuta: string | null;
  nombreFirmaCliente: string | null;
  firmaClienteUrl: string | null;
  tipoProyecto: "ingenio_santa_rosa" | "particular" | null;
  parcelas: { numeroParcela: string; hectareas: number }[];
  productos: { productoActivo: string; ltsPorHectarea: number }[];
};

export function InformeCampoForm({
  fechaHoy,
  colaboradoresCampo = [],
  valoresIniciales,
}: {
  fechaHoy: string;
  colaboradoresCampo?: string[];
  valoresIniciales?: ValoresInformeCampo;
}) {
  const esEdicion = Boolean(valoresIniciales?.id);
  const [state, formAction] = useActionState(
    esEdicion ? editarInformeCampoAction : crearInformeCampoAction,
    { error: null },
  );

  const v = state.values;

  // React 19 vacía todos los inputs no controlados del <form> después de
  // CUALQUIER resolución de la action, incluso en un error de validación
  // -- este remount fuerza a los campos con defaultValue a releerlo desde
  // "v" (lo que realmente se envió), en vez de perder lo que la persona
  // ya había escrito (mismo patrón que ProyectoInformeForm.tsx).
  const [prevState, setPrevState] = useState(state);
  const [remountKey, setRemountKey] = useState(0);

  const [operador, setOperador] = useState(v?.operador ?? valoresIniciales?.operador ?? "");

  const [ayudantes, setAyudantes] = useState<string[]>(() => {
    if (v?.ayudantes) {
      try {
        return JSON.parse(v.ayudantes) as string[];
      } catch {
        // sigue abajo con los valores iniciales / sin ayudantes
      }
    }
    return valoresIniciales?.ayudantes ?? [];
  });

  const [parcelas, setParcelas] = useState<ParcelaDraft[]>(() => {
    if (v?.parcelas) {
      try {
        const parsed = JSON.parse(v.parcelas) as { numeroParcela: string; hectareas: number }[];
        if (parsed.length > 0) {
          return parsed.map((p) => ({ numeroParcela: p.numeroParcela, hectareas: String(p.hectareas) }));
        }
      } catch {
        // sigue abajo
      }
    }
    if (valoresIniciales?.parcelas && valoresIniciales.parcelas.length > 0) {
      return valoresIniciales.parcelas.map((p) => ({
        numeroParcela: p.numeroParcela,
        hectareas: String(p.hectareas),
      }));
    }
    return [parcelaVacia()];
  });

  const [productos, setProductos] = useState<ProductoDraft[]>(() => {
    if (v?.productos) {
      try {
        const parsed = JSON.parse(v.productos) as { productoActivo: string; ltsPorHectarea: number }[];
        if (parsed.length > 0) {
          return parsed.map((p) => ({
            productoActivo: p.productoActivo,
            ltsPorHectarea: String(p.ltsPorHectarea),
          }));
        }
      } catch {
        // sigue abajo
      }
    }
    if (valoresIniciales?.productos && valoresIniciales.productos.length > 0) {
      return valoresIniciales.productos.map((p) => ({
        productoActivo: p.productoActivo,
        ltsPorHectarea: String(p.ltsPorHectarea),
      }));
    }
    // Opcional -- no siempre se usa, arranca sin filas (pedido explícito
    // del usuario).
    return [];
  });

  const [firmaAgroRuta, setFirmaAgroRuta] = useState(
    v?.firmaAgroRuta ?? valoresIniciales?.firmaAgroRuta ?? "",
  );
  const [firmaClienteRuta, setFirmaClienteRuta] = useState(
    v?.firmaClienteRuta ?? valoresIniciales?.firmaClienteRuta ?? "",
  );

  // Blobs crudos de cada firma, guardados SIEMPRE que se dibuja (haya o no
  // señal) -- si no hay señal, o si la subida falla a pesar de verse en
  // línea, quedan como la única copia disponible para guardar el informe
  // completo sin conexión (ver guardarLocalSinConexion).
  const firmaAgroBlobRef = useRef<Blob | null>(null);
  const firmaClienteBlobRef = useRef<Blob | null>(null);

  const enLinea = useSyncExternalStore(suscribirseConexion, leerConexionCliente, leerConexionServidor);
  const [guardandoLocal, setGuardandoLocal] = useState(false);
  const [guardadoLocalOk, setGuardadoLocalOk] = useState(false);
  const [errorLocal, setErrorLocal] = useState<string | null>(null);

  if (state !== prevState) {
    setPrevState(state);
    setRemountKey((k) => k + 1);
  }

  function agregarAyudante() {
    setAyudantes((prev) => [...prev, ""]);
  }
  function actualizarAyudante(i: number, valor: string) {
    setAyudantes((prev) => prev.map((a, idx) => (idx === i ? valor : a)));
  }
  function quitarAyudante(i: number) {
    setAyudantes((prev) => prev.filter((_, idx) => idx !== i));
  }

  function actualizarParcela(i: number, campo: keyof ParcelaDraft, valor: string) {
    setParcelas((prev) => prev.map((p, idx) => (idx === i ? { ...p, [campo]: valor } : p)));
  }
  function agregarParcela() {
    setParcelas((prev) => [...prev, parcelaVacia()]);
  }
  function quitarParcela(i: number) {
    setParcelas((prev) => (prev.length > 1 ? prev.filter((_, idx) => idx !== i) : prev));
  }

  function actualizarProducto(i: number, campo: keyof ProductoDraft, valor: string) {
    setProductos((prev) => prev.map((p, idx) => (idx === i ? { ...p, [campo]: valor } : p)));
  }
  function agregarProducto() {
    setProductos((prev) => [...prev, productoVacio()]);
  }
  function quitarProducto(i: number) {
    // Opcional -- a diferencia de Parcelas, se puede quitar hasta la
    // última fila (queda un array vacío).
    setProductos((prev) => prev.filter((_, idx) => idx !== i));
  }

  // Sube la firma normalmente si hay señal; si no la hay (o la subida
  // falla a pesar de verse en línea, ej. señal débil intermitente), la
  // deja marcada como pendiente -- el blob ya quedó guardado en el ref de
  // todas formas, así que el informe se puede guardar completo sin
  // conexión y esa firma se sube más tarde junto con el resto.
  async function subirFirmaAgro(blob: Blob): Promise<string> {
    firmaAgroBlobRef.current = blob;
    if (!navigator.onLine) return SIN_CONEXION;
    try {
      const fd = new FormData();
      fd.append("firma", blob, "firma.png");
      const { ruta } = await subirFirmaInformeCampoAction(fd);
      return ruta;
    } catch {
      return SIN_CONEXION;
    }
  }
  async function subirFirmaCliente(blob: Blob): Promise<string> {
    firmaClienteBlobRef.current = blob;
    if (!navigator.onLine) return SIN_CONEXION;
    try {
      const fd = new FormData();
      fd.append("firma", blob, "firma.png");
      const { ruta } = await subirFirmaInformeCampoAction(fd);
      return ruta;
    } catch {
      return SIN_CONEXION;
    }
  }

  // Guarda el informe completo (datos + las 2 firmas como PNG crudo) en
  // IndexedDB en vez de enviarlo al servidor -- SincronizadorInformesCampo
  // (montado en el layout general) lo sube solo en cuanto detecta señal de
  // nuevo, sin que el operador tenga que volver a esta pantalla.
  async function guardarLocalSinConexion(formData: FormData) {
    setGuardandoLocal(true);
    setErrorLocal(null);
    try {
      const raw = Object.fromEntries(formData) as Record<string, string>;
      let ayudantesRaw: unknown;
      let parcelasRaw: unknown;
      let productosRaw: unknown;
      try {
        ayudantesRaw = JSON.parse(raw.ayudantes || "[]");
        parcelasRaw = JSON.parse(raw.parcelas || "[]");
        productosRaw = JSON.parse(raw.productos || "[]");
      } catch {
        throw new Error("No se pudieron leer los datos del informe.");
      }

      if (!firmaAgroBlobRef.current || !firmaClienteBlobRef.current) {
        throw new Error("Faltan firmas por guardar.");
      }

      const parsed = informeCampoSchema.safeParse({
        cliente: raw.cliente,
        fecha: raw.fecha,
        finca: raw.finca,
        horaInicio: raw.horaInicio,
        horaFin: raw.horaFin,
        meteorologia: raw.meteorologia,
        modeloDrone: raw.modeloDrone,
        dosisPorHectarea: raw.dosisPorHectarea,
        tipoProyecto: raw.tipoProyecto,
        operador: raw.operador,
        ayudantes: ayudantesRaw,
        firmaAgroRuta: raw.firmaAgroRuta,
        nombreFirmaAgro: raw.nombreFirmaAgro,
        firmaClienteRuta: raw.firmaClienteRuta,
        nombreFirmaCliente: raw.nombreFirmaCliente,
        parcelas: parcelasRaw,
        productos: productosRaw,
      });

      if (!parsed.success) {
        throw new Error(parsed.error.issues[0]?.message ?? "Datos inválidos");
      }

      await guardarInformeCampoPendiente(
        {
          cliente: parsed.data.cliente,
          fecha: parsed.data.fecha,
          finca: parsed.data.finca,
          horaInicio: parsed.data.horaInicio,
          horaFin: parsed.data.horaFin,
          meteorologia: parsed.data.meteorologia,
          modeloDrone: parsed.data.modeloDrone,
          dosisPorHectarea: parsed.data.dosisPorHectarea,
          tipoProyecto: parsed.data.tipoProyecto,
          operador: parsed.data.operador,
          ayudantes: parsed.data.ayudantes,
          nombreFirmaAgro: parsed.data.nombreFirmaAgro,
          nombreFirmaCliente: parsed.data.nombreFirmaCliente,
          parcelas: parsed.data.parcelas,
          productos: parsed.data.productos,
        },
        firmaAgroBlobRef.current,
        firmaClienteBlobRef.current,
      );

      setGuardadoLocalOk(true);
    } catch (err) {
      setErrorLocal(
        err instanceof Error ? err.message : "No se pudo guardar el informe en este celular.",
      );
    } finally {
      setGuardandoLocal(false);
    }
  }

  function manejarSubmit(e: React.FormEvent<HTMLFormElement>) {
    // El modo sin conexión solo aplica a informes nuevos -- editar uno ya
    // guardado sigue requiriendo señal, como antes.
    if (esEdicion) return;
    const formData = new FormData(e.currentTarget);
    const necesitaGuardarLocal =
      !navigator.onLine ||
      formData.get("firmaAgroRuta") === SIN_CONEXION ||
      formData.get("firmaClienteRuta") === SIN_CONEXION;
    if (necesitaGuardarLocal) {
      e.preventDefault();
      guardarLocalSinConexion(formData);
    }
  }

  function reiniciarParaOtroInforme() {
    setRemountKey((k) => k + 1);
    setOperador("");
    setAyudantes([]);
    setParcelas([parcelaVacia()]);
    setProductos([]);
    setFirmaAgroRuta("");
    setFirmaClienteRuta("");
    firmaAgroBlobRef.current = null;
    firmaClienteBlobRef.current = null;
    setGuardadoLocalOk(false);
    setErrorLocal(null);
  }

  const ayudantesParaEnviar = ayudantes.map((a) => a.trim()).filter((a) => a !== "");
  const parcelasParaEnviar = parcelas.map((p) => ({
    numeroParcela: p.numeroParcela,
    hectareas: Number(p.hectareas) || 0,
  }));
  const productosParaEnviar = productos.map((p) => ({
    productoActivo: p.productoActivo,
    ltsPorHectarea: Number(p.ltsPorHectarea) || 0,
  }));

  const faltaAlgunaFirma = !firmaAgroRuta || !firmaClienteRuta;

  if (guardadoLocalOk) {
    return (
      <div className="flex max-w-2xl flex-col gap-4 rounded-xl border border-green-100 bg-white p-6 shadow-sm dark:border-green-900/40 dark:bg-green-950/10">
        <p className="text-lg font-semibold text-green-900 dark:text-green-50">
          Informe guardado en este celular ✓
        </p>
        <p className="text-sm text-green-700/70 dark:text-green-200/70">
          No hay señal ahora mismo -- el informe (con las 2 firmas) quedó guardado en este dispositivo
          y se subirá solo al sistema en cuanto vuelva la señal de datos, sin que tengas que hacer nada
          más. Todavía no va a aparecer en la lista de Informes de Campo hasta que se suba.
        </p>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={reiniciarParaOtroInforme}
            className="rounded-lg bg-gradient-to-r from-green-600 to-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-sm"
          >
            Llenar otro informe
          </button>
          <LinkButton href="/informes/campo" variant="secondary">
            Ver Informes de Campo
          </LinkButton>
        </div>
      </div>
    );
  }

  return (
    <form key={remountKey} action={formAction} onSubmit={manejarSubmit} className="flex flex-col gap-6">
      <FormError message={state.error} />
      <input type="hidden" name="ayudantes" value={JSON.stringify(ayudantesParaEnviar)} />
      <input type="hidden" name="parcelas" value={JSON.stringify(parcelasParaEnviar)} />
      <input type="hidden" name="productos" value={JSON.stringify(productosParaEnviar)} />
      {esEdicion && <input type="hidden" name="id" value={valoresIniciales!.id} />}

      <div className="grid max-w-2xl grid-cols-1 gap-4 rounded-xl border border-green-100 bg-white p-6 shadow-sm sm:grid-cols-2 dark:border-green-900/40 dark:bg-green-950/10">
        <div className="sm:col-span-2">
          <Field
            label="Nombre del cliente"
            name="cliente"
            defaultValue={v?.cliente ?? valoresIniciales?.cliente ?? undefined}
            required
          />
        </div>
        <SelectField
          label="Tipo de proyecto"
          name="tipoProyecto"
          defaultValue={v?.tipoProyecto ?? valoresIniciales?.tipoProyecto ?? "ingenio_santa_rosa"}
          required
        >
          <option value="ingenio_santa_rosa">Ingenio Santa Rosa</option>
          <option value="particular">Trabajo Particular</option>
        </SelectField>
        <Field
          label="Fecha de trabajo"
          name="fecha"
          type="date"
          defaultValue={v?.fecha ?? valoresIniciales?.fecha ?? fechaHoy}
          required
        />
        <Field
          label="Finca"
          name="finca"
          defaultValue={v?.finca ?? valoresIniciales?.finca ?? undefined}
          required
        />
        <Field
          label="Hora de inicio"
          name="horaInicio"
          type="time"
          defaultValue={v?.horaInicio ?? valoresIniciales?.horaInicio ?? undefined}
          required
        />
        <Field
          label="Hora de finalización"
          name="horaFin"
          type="time"
          defaultValue={v?.horaFin ?? valoresIniciales?.horaFin ?? undefined}
          required
        />
        <div className="sm:col-span-2">
          <Field
            label="Meteorología"
            name="meteorologia"
            defaultValue={v?.meteorologia ?? valoresIniciales?.meteorologia ?? undefined}
            placeholder="Ej. Soleado, viento leve"
            required
          />
        </div>
      </div>

      <div className="flex flex-col gap-4 rounded-xl border border-green-100 bg-white p-6 shadow-sm dark:border-green-900/40 dark:bg-green-950/10">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-green-700/80 dark:text-green-300/80">
          Parcelas
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[360px] text-left text-sm">
            <thead>
              <tr className="border-b border-green-100 text-xs uppercase tracking-wide text-green-700 dark:border-green-900/40 dark:text-green-300">
                <th className="px-2 py-2 font-medium">Parcela #</th>
                <th className="px-2 py-2 font-medium">Hectáreas</th>
                <th className="px-2 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {parcelas.map((p, i) => (
                <tr key={i} className="border-b border-green-50 last:border-0 dark:border-green-900/30">
                  <td className="px-2 py-2">
                    <input
                      value={p.numeroParcela}
                      onChange={(e) => actualizarParcela(i, "numeroParcela", e.target.value)}
                      className={CLASE_INPUT}
                    />
                  </td>
                  <td className="px-2 py-2">
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      value={p.hectareas}
                      onChange={(e) => actualizarParcela(i, "hectareas", e.target.value)}
                      className={CLASE_INPUT}
                    />
                  </td>
                  <td className="px-2 py-2">
                    <button
                      type="button"
                      onClick={() => quitarParcela(i)}
                      disabled={parcelas.length === 1}
                      className="text-sm text-red-600 hover:underline disabled:opacity-30 dark:text-red-400"
                    >
                      Quitar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <button
          type="button"
          onClick={agregarParcela}
          className="self-start rounded-lg border border-green-200 px-3 py-1.5 text-sm text-green-800 hover:bg-green-50 dark:border-green-800 dark:text-green-200 dark:hover:bg-green-950/40"
        >
          + Agregar parcela
        </button>
      </div>

      <div className="grid max-w-2xl grid-cols-1 gap-4 rounded-xl border border-green-100 bg-white p-6 shadow-sm sm:grid-cols-2 dark:border-green-900/40 dark:bg-green-950/10">
        <Field
          label="Modelo de Drone"
          name="modeloDrone"
          defaultValue={v?.modeloDrone ?? valoresIniciales?.modeloDrone ?? undefined}
          required
        />
        <Field
          label="Dosis por Hectárea"
          name="dosisPorHectarea"
          placeholder="Ej. 2.8qxHA"
          defaultValue={v?.dosisPorHectarea ?? valoresIniciales?.dosisPorHectarea ?? undefined}
          required
        />
      </div>

      <div className="flex flex-col gap-3 rounded-xl border border-green-100 bg-white p-6 shadow-sm dark:border-green-900/40 dark:bg-green-950/10">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-green-700/80 dark:text-green-300/80">
          Equipo de Campo
        </h2>
        <div className="flex flex-wrap items-end gap-3">
          <SelectField
            label="Operador"
            name="operador"
            defaultValue={operador}
            onChange={(e) => setOperador(e.target.value)}
            required
          >
            <option value="">Selecciona...</option>
            {colaboradoresCampo.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </SelectField>
          {ayudantes.map((ayudante, i) => (
            <div key={i} className="flex items-end gap-1">
              <SelectField
                label={`Ayudante ${i + 1}`}
                name={`ayudante-${i}`}
                defaultValue={ayudante}
                onChange={(e) => actualizarAyudante(i, e.target.value)}
              >
                <option value="">Selecciona...</option>
                {colaboradoresCampo.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </SelectField>
              <button
                type="button"
                onClick={() => quitarAyudante(i)}
                className="pb-2 text-sm text-red-600 hover:underline dark:text-red-400"
              >
                Quitar
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={agregarAyudante}
          className="self-start rounded-lg border border-green-200 px-3 py-1 text-xs text-green-800 hover:bg-green-50 dark:border-green-800 dark:text-green-200 dark:hover:bg-green-950/40"
        >
          + Agregar ayudante
        </button>
      </div>

      <div className="flex flex-col gap-4 rounded-xl border border-green-100 bg-white p-6 shadow-sm dark:border-green-900/40 dark:bg-green-950/10">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-green-700/80 dark:text-green-300/80">
            Productos
          </h2>
          <p className="mt-1 text-xs text-green-700/60 dark:text-green-300/60">
            Opcional — no siempre se usa.
          </p>
        </div>
        {productos.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[420px] text-left text-sm">
              <thead>
                <tr className="border-b border-green-100 text-xs uppercase tracking-wide text-green-700 dark:border-green-900/40 dark:text-green-300">
                  <th className="px-2 py-2 font-medium">Producto activo</th>
                  <th className="px-2 py-2 font-medium">Lts por Hectárea</th>
                  <th className="px-2 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {productos.map((p, i) => (
                  <tr key={i} className="border-b border-green-50 last:border-0 dark:border-green-900/30">
                    <td className="px-2 py-2">
                      <input
                        value={p.productoActivo}
                        onChange={(e) => actualizarProducto(i, "productoActivo", e.target.value)}
                        className={CLASE_INPUT}
                      />
                    </td>
                    <td className="px-2 py-2">
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        value={p.ltsPorHectarea}
                        onChange={(e) => actualizarProducto(i, "ltsPorHectarea", e.target.value)}
                        className={CLASE_INPUT}
                      />
                    </td>
                    <td className="px-2 py-2">
                      <button
                        type="button"
                        onClick={() => quitarProducto(i)}
                        className="text-sm text-red-600 hover:underline dark:text-red-400"
                      >
                        Quitar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <button
          type="button"
          onClick={agregarProducto}
          className="self-start rounded-lg border border-green-200 px-3 py-1.5 text-sm text-green-800 hover:bg-green-50 dark:border-green-800 dark:text-green-200 dark:hover:bg-green-950/40"
        >
          + Agregar producto
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6 rounded-xl border border-green-100 bg-white p-6 shadow-sm sm:grid-cols-2 dark:border-green-900/40 dark:bg-green-950/10">
        <div className="flex flex-col gap-3">
          <Field
            label="Nombre — Encargado Agro Sky Corp"
            name="nombreFirmaAgro"
            defaultValue={v?.nombreFirmaAgro ?? valoresIniciales?.nombreFirmaAgro ?? undefined}
            required
          />
          <FirmaCanvas
            label="Firma — Encargado Agro Sky Corp"
            name="firmaAgroRuta"
            rutaInicial={v?.firmaAgroRuta ?? valoresIniciales?.firmaAgroRuta}
            urlInicial={valoresIniciales?.firmaAgroUrl}
            onGuardar={subirFirmaAgro}
            onRutaCambia={setFirmaAgroRuta}
          />
        </div>
        <div className="flex flex-col gap-3">
          <Field
            label="Nombre — Encargado por parte del cliente"
            name="nombreFirmaCliente"
            defaultValue={v?.nombreFirmaCliente ?? valoresIniciales?.nombreFirmaCliente ?? undefined}
            required
          />
          <FirmaCanvas
            label="Firma — Encargado por parte del cliente"
            name="firmaClienteRuta"
            rutaInicial={v?.firmaClienteRuta ?? valoresIniciales?.firmaClienteRuta}
            urlInicial={valoresIniciales?.firmaClienteUrl}
            onGuardar={subirFirmaCliente}
            onRutaCambia={setFirmaClienteRuta}
          />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        {!esEdicion && !enLinea && (
          <p className="text-xs text-amber-700 dark:text-amber-400">
            Sin conexión -- el informe se va a guardar en este celular y se va a subir solo cuando
            vuelva la señal.
          </p>
        )}
        {errorLocal && <p className="text-xs text-red-600 dark:text-red-400">{errorLocal}</p>}
        <div className="flex gap-3">
          <SubmitButton disabled={faltaAlgunaFirma || guardandoLocal}>
            {guardandoLocal
              ? "Guardando en este celular..."
              : esEdicion
                ? "Guardar cambios"
                : "Guardar informe"}
          </SubmitButton>
          <LinkButton
            href={esEdicion ? `/informes/campo/${valoresIniciales!.id}` : "/informes/campo"}
            variant="secondary"
          >
            Cancelar
          </LinkButton>
        </div>
        {faltaAlgunaFirma && (
          <p className="text-xs text-green-700/70 dark:text-green-300/70">
            Faltan firmas por guardar — dibuja y guarda ambas firmas antes de guardar el informe.
          </p>
        )}
      </div>
    </form>
  );
}
