"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { biometricoDisponible, biometricoRegistrado } from "@/lib/webauthn";

const PREFIJO_DESCARTADO = "agro-sky-biometrico-aviso-descartado-";

export function BiometricoAviso({ userId }: { userId: string }) {
  const [mostrar, setMostrar] = useState(false);

  useEffect(() => {
    let cancelado = false;

    biometricoDisponible().then((disponible) => {
      if (cancelado) return;
      if (!disponible) return;
      if (biometricoRegistrado(userId)) return;
      if (localStorage.getItem(PREFIJO_DESCARTADO + userId)) return;
      setMostrar(true);
    });

    return () => {
      cancelado = true;
    };
  }, [userId]);

  function descartar() {
    localStorage.setItem(PREFIJO_DESCARTADO + userId, "1");
    setMostrar(false);
  }

  if (!mostrar) return null;

  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm dark:border-green-800 dark:bg-green-950/40">
      <span className="text-green-800 dark:text-green-100">
        ¿Quieres abrir Agro Sky con tu huella o rostro en este dispositivo?
      </span>
      <div className="flex shrink-0 gap-4">
        <Link
          href="/mi-perfil"
          className="font-medium text-green-700 hover:underline dark:text-green-300"
        >
          Activarlo
        </Link>
        <button
          onClick={descartar}
          className="text-green-700/60 hover:underline dark:text-green-300/60"
        >
          Ahora no
        </button>
      </div>
    </div>
  );
}
