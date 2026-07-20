import Link from "next/link";

export default function UnauthorizedPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-white px-6 text-center dark:bg-[#0a0f0c]">
      <h1 className="text-xl font-semibold text-green-900 dark:text-green-50">
        No tienes acceso a esta sección
      </h1>
      <p className="max-w-sm text-sm text-green-700/70 dark:text-green-200/70">
        Si crees que deberías tener acceso, pide a un administrador que
        revise tu rol en la sección de Usuarios.
      </p>
      <Link
        href="/inventario/nuevos"
        className="rounded-full bg-gradient-to-r from-green-600 to-emerald-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-opacity hover:opacity-90"
      >
        Volver al Inventario
      </Link>
    </main>
  );
}
