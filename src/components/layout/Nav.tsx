"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SignOutButton } from "./SignOutButton";
import { NAV } from "./nav-items";
import { SECTION_ACCESS, ROL_LABEL, type Rol } from "@/lib/roles";
import { Logo } from "@/components/ui/Logo";

function EnlaceNav({
  href,
  label,
  activo,
}: {
  href: string;
  label: string;
  activo: boolean;
}) {
  return (
    <Link
      href={href}
      className={
        activo
          ? "rounded-full bg-gradient-to-r from-green-600 to-emerald-600 px-3 py-1.5 font-medium text-white"
          : "rounded-full px-3 py-1.5 text-green-800 hover:bg-green-50 dark:text-green-200 dark:hover:bg-green-950/40"
      }
    >
      {label}
    </Link>
  );
}

export function Nav({
  nombreCompleto,
  rol,
  userId,
}: {
  nombreCompleto: string;
  rol: Rol;
  userId: string;
}) {
  const pathname = usePathname();
  const items = NAV.filter((item) => SECTION_ACCESS[item.seccion].includes(rol));

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-20 border-b border-green-200 bg-green-50/95 backdrop-blur dark:border-green-900 dark:bg-green-950/95 sm:sticky sm:border-green-100 sm:bg-white/90 sm:dark:border-green-900/40 sm:dark:bg-[#0a0f0c]/90">
        <div className="flex items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <Logo width={40} height={40} />
            <span className="hidden font-semibold text-green-900 dark:text-green-50 sm:inline">
              Agro Sky
            </span>
            <nav className="ml-2 hidden flex-wrap gap-1 text-sm sm:flex">
              {items.map((item) => (
                <EnlaceNav
                  key={item.href}
                  href={item.href}
                  label={item.label}
                  activo={pathname.startsWith(item.href)}
                />
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/mi-perfil"
              className="hidden text-right text-sm leading-tight hover:opacity-80 sm:block"
            >
              <span className="block font-medium text-green-900 dark:text-green-50">
                {nombreCompleto}
              </span>
              <span className="block text-xs text-green-700/70 dark:text-green-300/70">
                {ROL_LABEL[rol]}
              </span>
            </Link>
            <Link
              href="/mi-perfil"
              className="rounded-full border border-green-200 px-3 py-1.5 text-sm text-green-800 hover:bg-green-50 dark:border-green-800 dark:text-green-100 dark:hover:bg-green-950/40 sm:hidden"
            >
              Mi perfil
            </Link>
            <SignOutButton userId={userId} />
          </div>
        </div>
      </header>

      {/* Barra de menu fija abajo, solo en movil */}
      <nav className="fixed inset-x-0 bottom-0 z-20 flex flex-wrap justify-center gap-1 border-t border-green-200 bg-green-50/95 px-2 py-2 backdrop-blur dark:border-green-900 dark:bg-green-950/95 sm:hidden">
        {items.map((item) => (
          <EnlaceNav
            key={item.href}
            href={item.href}
            label={item.label}
            activo={pathname.startsWith(item.href)}
          />
        ))}
      </nav>
    </>
  );
}
