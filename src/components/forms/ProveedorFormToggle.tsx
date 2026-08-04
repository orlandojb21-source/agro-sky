"use client";

import { useState } from "react";

export function ProveedorFormToggle({ children }: { children: React.ReactNode }) {
  const [abierto, setAbierto] = useState(false);

  if (!abierto) {
    return (
      <button
        onClick={() => setAbierto(true)}
        className="self-start rounded-full bg-gradient-to-r from-green-600 to-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-sm"
      >
        + Agregar proveedor
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {children}
      <button
        onClick={() => setAbierto(false)}
        className="self-start text-sm text-green-700 hover:underline dark:text-green-300"
      >
        Cerrar
      </button>
    </div>
  );
}
