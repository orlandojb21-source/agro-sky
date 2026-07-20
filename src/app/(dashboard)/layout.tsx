import { getPerfilActual } from "@/lib/perfil";
import { SignOutButton } from "@/components/layout/SignOutButton";
import { Nav } from "@/components/layout/Nav";
import { BiometricoAviso } from "@/components/layout/BiometricoAviso";
import { Logo } from "@/components/ui/Logo";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const perfil = await getPerfilActual();

  if (!perfil) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-white px-6 text-center dark:bg-[#0a0f0c]">
        <Logo width={140} height={140} priority />
        <h1 className="text-2xl font-semibold text-green-900 dark:text-green-50">
          Cuenta pendiente de activación
        </h1>
        <p className="max-w-md text-green-700/70 dark:text-green-200/70">
          Tu inicio de sesión funcionó, pero tu cuenta todavía no tiene un
          perfil asignado. Contacta a un administrador de Agro Sky para
          activarla.
        </p>
        <SignOutButton />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-green-50/40 dark:bg-[#0a0f0c]">
      <Nav nombreCompleto={perfil.nombreCompleto} rol={perfil.rol} userId={perfil.id} />
      <main className="flex-1 px-4 pt-20 pb-24 sm:px-6 sm:pt-24 sm:pb-8">
        <BiometricoAviso userId={perfil.id} />
        {children}
      </main>
    </div>
  );
}
