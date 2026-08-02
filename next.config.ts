import type { NextConfig } from "next";

// Cabeceras de seguridad globales (SECURITY_REVIEW.md, hallazgo 1.4). El
// Content-Security-Policy va aparte, en src/lib/supabase/middleware.ts,
// porque necesita un nonce distinto en cada request -- estas de acá son
// estáticas y aplican a toda respuesta, páginas y archivos estáticos por
// igual.
const CABECERAS_SEGURIDAD = [
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), geolocation=(), microphone=(), payment=(), usb=()",
  },
];

const nextConfig: NextConfig = {
  // El indicador de Next.js Dev Tools (solo en `next dev`, nunca en
  // producción) quedaba tapando el botón "Guardar informe" al fondo de
  // formularios largos -- Next.js lo agregó de fábrica en la posición
  // "bottom-left"; se reposiciona a "top-right" donde no hay controles.
  devIndicators: {
    position: "top-right",
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: CABECERAS_SEGURIDAD,
      },
    ];
  },
};

export default nextConfig;
