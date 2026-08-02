import { SplashScreen } from "./SplashScreen";

// Server Component a propósito (SplashScreen es "use client" en su propio
// archivo): `dynamic` solo lo respeta Next.js cuando se exporta desde un
// Server Component. Sin esto, Vercel serviría el HTML prerenderizado de
// esta página desde su caché con un nonce de CSP viejo, que nunca coincide
// con el nonce fresco que el middleware genera para la cabecera CSP de
// cada request -- el navegador bloquea todos los scripts y la app queda
// sin reaccionar (esta es literalmente la pantalla de entrada, así que
// esto rompía la app completa, no solo el login).
export const dynamic = "force-dynamic";

export default function Page() {
  return <SplashScreen />;
}
