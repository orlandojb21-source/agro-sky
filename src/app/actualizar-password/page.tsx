import { ActualizarPasswordForm } from "./ActualizarPasswordForm";

// Server Component a propósito (ActualizarPasswordForm es "use client" en
// su propio archivo): `dynamic` solo lo respeta Next.js cuando se exporta
// desde un Server Component. Ver la misma nota en src/app/page.tsx.
export const dynamic = "force-dynamic";

export default function ActualizarPasswordPage() {
  return <ActualizarPasswordForm />;
}
