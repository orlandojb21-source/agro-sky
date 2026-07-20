export default function OfflinePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-white px-6 text-center dark:bg-[#0a0f0c]">
      {/* <img> a proposito: esta pagina la sirve el service worker sin red,
          y next/image pediria /_next/image (requiere red) para optimizarla.
          Dos versiones del logo (clara/oscura) igual que en el resto de la
          app, ver src/components/ui/Logo.tsx. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/logo.png" alt="" className="hidden h-24 w-24 object-contain dark:block" />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/logo-claro.png" alt="" className="h-24 w-24 object-contain dark:hidden" />
      <h1 className="text-xl font-semibold text-green-900 dark:text-green-50">
        Sin conexión
      </h1>
      <p className="max-w-sm text-sm text-green-700/70 dark:text-green-200/70">
        No se pudo cargar esta página. Revisa tu conexión a internet e
        intenta de nuevo.
      </p>
    </main>
  );
}
