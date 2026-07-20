"use client";

import { useEffect, useState } from "react";
import {
  biometricoDisponible,
  biometricoRegistrado,
  registrarBiometrico,
  olvidarBiometrico,
} from "@/lib/webauthn";

export function BiometricoToggle({
  userId,
  email,
  nombreCompleto,
}: {
  userId: string;
  email: string;
  nombreCompleto: string;
}) {
  const [disponible, setDisponible] = useState(false);
  const [activo, setActivo] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [listo, setListo] = useState(false);

  useEffect(() => {
    biometricoDisponible().then((ok) => {
      setDisponible(ok);
      setActivo(biometricoRegistrado(userId));
      setListo(true);
    });
  }, [userId]);

  async function handleToggle() {
    setError(null);

    if (activo) {
      olvidarBiometrico(userId);
      setActivo(false);
      return;
    }

    setCargando(true);
    const ok = await registrarBiometrico(userId, email, nombreCompleto);
    setCargando(false);

    if (!ok) {
      setError("No se pudo activar. Intenta de nuevo o revisa los permisos del navegador.");
      return;
    }
    setActivo(true);
  }

  if (!listo || !disponible) return null;

  return (
    <div className="flex max-w-md flex-col gap-3 rounded-xl border border-green-100 bg-white p-6 shadow-sm dark:border-green-900/40 dark:bg-green-950/10">
      <h2 className="font-semibold text-green-900 dark:text-green-50">
        Desbloqueo con huella o rostro
      </h2>
      <p className="text-sm text-green-700/70 dark:text-green-200/70">
        Actívalo para abrir Agro Sky en este dispositivo con tu huella o
        rostro, en vez de escribir tu contraseña cada vez.
      </p>
      {error && (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
          {error}
        </p>
      )}
      <button
        onClick={handleToggle}
        disabled={cargando}
        className={
          activo
            ? "self-start rounded-full border border-green-200 px-4 py-2 text-sm text-green-800 hover:bg-green-50 disabled:opacity-50 dark:border-green-800 dark:text-green-200 dark:hover:bg-green-950/40"
            : "self-start rounded-full bg-gradient-to-r from-green-600 to-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:opacity-90 disabled:opacity-50"
        }
      >
        {cargando
          ? "Un momento..."
          : activo
            ? "Desactivar en este dispositivo"
            : "Activar en este dispositivo"}
      </button>
    </div>
  );
}
