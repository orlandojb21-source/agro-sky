"use client";

import { useState } from "react";

// Miniatura clicable que abre la imagen completa en un visor a pantalla
// completa -- pedido explícito del usuario para las fotos de piezas
// cambiadas en Mantenimiento Correctivo (necesita verlas bien para
// justificar si el cambio hacía falta).
export function ImagenAmpliable({
  src,
  alt,
  className,
}: {
  src: string;
  alt: string;
  className?: string;
}) {
  const [abierta, setAbierta] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setAbierta(true)}
        className="cursor-zoom-in"
        aria-label={`Ampliar ${alt}`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={alt} className={className} />
      </button>

      {abierta && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4"
          onClick={() => setAbierta(false)}
        >
          <button
            type="button"
            onClick={() => setAbierta(false)}
            aria-label="Cerrar"
            className="absolute right-4 top-4 text-3xl leading-none text-white/90 hover:text-white"
          >
            ×
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={src} alt={alt} className="max-h-full max-w-full cursor-zoom-out rounded-lg object-contain" />
        </div>
      )}
    </>
  );
}
