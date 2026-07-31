"use client";

import { useRef, useState } from "react";

const ANCHO_CANVAS = 500;
const ALTO_CANVAS = 180;

export function FirmaCanvas({
  label,
  name,
  rutaInicial,
  urlInicial,
  onGuardar,
  onRutaCambia,
}: {
  label: string;
  // Nombre del <input type="hidden"> que lleva la ruta de la firma en el
  // bucket privado -- este componente se encarga de renderizarlo solo.
  name: string;
  rutaInicial?: string | null;
  // URL firmada (temporal) de una firma ya guardada, generada del lado del
  // servidor solo para mostrarla.
  urlInicial?: string | null;
  // Sube el PNG dibujado y devuelve la ruta guardada -- quien use este
  // componente decide a qué bucket/acción sube (lo hace genérico, no
  // depende de informes-campo-firmas específicamente).
  onGuardar: (blob: Blob) => Promise<string>;
  onRutaCambia?: (ruta: string) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dibujandoRef = useRef(false);
  const [modo, setModo] = useState<"guardada" | "dibujando">(urlInicial ? "guardada" : "dibujando");
  const [tieneTrazos, setTieneTrazos] = useState(false);
  const [ruta, setRuta] = useState(rutaInicial ?? "");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function actualizarRuta(nueva: string) {
    setRuta(nueva);
    onRutaCambia?.(nueva);
  }

  function coordenadas(e: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * canvas.width,
      y: ((e.clientY - rect.top) / rect.height) * canvas.height,
    };
  }

  function iniciarTrazo(e: React.PointerEvent<HTMLCanvasElement>) {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    dibujandoRef.current = true;
    const { x, y } = coordenadas(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  }

  function trazar(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!dibujandoRef.current) return;
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const { x, y } = coordenadas(e);
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#111827";
    ctx.lineTo(x, y);
    ctx.stroke();
    setTieneTrazos(true);
  }

  function terminarTrazo() {
    dibujandoRef.current = false;
  }

  function limpiar() {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (canvas && ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    setTieneTrazos(false);
    setError(null);
    actualizarRuta("");
  }

  function rehacer() {
    setModo("dibujando");
    limpiar();
  }

  async function guardar() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setGuardando(true);
    setError(null);
    try {
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
      if (!blob) throw new Error("No se pudo capturar la firma.");
      const nuevaRuta = await onGuardar(blob);
      actualizarRuta(nuevaRuta);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar la firma.");
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm text-green-900 dark:text-green-100">{label}</span>
      <input type="hidden" name={name} value={ruta} />

      {modo === "guardada" ? (
        <div className="flex flex-col gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={urlInicial ?? undefined}
            alt={`Firma: ${label}`}
            className="h-[180px] w-full max-w-[500px] rounded-lg border border-green-200 bg-white object-contain dark:border-green-800"
          />
          <button
            type="button"
            onClick={rehacer}
            className="self-start text-xs text-green-700 hover:underline dark:text-green-300"
          >
            Rehacer firma
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <canvas
            ref={canvasRef}
            width={ANCHO_CANVAS}
            height={ALTO_CANVAS}
            onPointerDown={iniciarTrazo}
            onPointerMove={trazar}
            onPointerUp={terminarTrazo}
            onPointerLeave={terminarTrazo}
            className="h-[180px] w-full max-w-[500px] touch-none rounded-lg border border-green-200 bg-white dark:border-green-800"
          />
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={guardar}
              disabled={!tieneTrazos || guardando}
              className="rounded-lg border border-green-300 px-3 py-1.5 text-sm text-green-800 hover:bg-green-50 disabled:opacity-50 dark:border-green-700 dark:text-green-200 dark:hover:bg-green-950/40"
            >
              {guardando ? "Guardando..." : ruta ? "Firma guardada ✓" : "Guardar firma"}
            </button>
            <button
              type="button"
              onClick={limpiar}
              className="text-xs text-green-700 hover:underline dark:text-green-300"
            >
              Limpiar
            </button>
          </div>
          {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
        </div>
      )}
    </div>
  );
}
