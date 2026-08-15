import Link from "next/link";
import {
  Wallet,
  Package,
  Plane,
  Users,
  FolderKanban,
  BarChart3,
  HandCoins,
  ShoppingCart,
  UserCog,
  type LucideIcon,
} from "lucide-react";
import { requirePerfil } from "@/lib/session";
import { canAccess, type Seccion } from "@/lib/roles";
import { NAV } from "@/components/layout/nav-items";
import { Logo } from "@/components/ui/Logo";

// Todo el menú, en el mismo orden que se venía usando para los accesos
// directos del inicio (Compras y Usuarios se agregan al final -- antes
// quedaban fuera a propósito, ahora el usuario pidió el menú completo).
const SECCIONES_INICIO: Seccion[] = [
  "gastos-operativos",
  "inventario",
  "bitacora",
  "planilla",
  "informes",
  "balance",
  "ventas",
  "compras",
  "usuarios",
];

const ICONOS_INICIO: Record<Seccion, LucideIcon> = {
  "gastos-operativos": Wallet,
  inventario: Package,
  bitacora: Plane,
  planilla: Users,
  informes: FolderKanban,
  balance: BarChart3,
  ventas: HandCoins,
  compras: ShoppingCart,
  usuarios: UserCog,
};

export default async function InicioPage() {
  const perfil = await requirePerfil();

  const accesos = SECCIONES_INICIO.map((seccion) => NAV.find((item) => item.seccion === seccion)).filter(
    (item): item is (typeof NAV)[number] => item !== undefined && canAccess(perfil.rol, item.seccion),
  );

  return (
    <div className="flex flex-col items-center gap-8 py-6">
      <Logo width={160} height={160} priority />

      <div className="text-center">
        <h1 className="text-xl font-semibold text-green-900 dark:text-green-50">
          Hola, {perfil.nombreCompleto}
        </h1>
        <p className="text-sm text-green-700/70 dark:text-green-300/70">¿A dónde quieres ir?</p>
      </div>

      <div className="flex w-full max-w-2xl flex-wrap justify-center gap-3">
        {accesos.map((item) => {
          const Icono = ICONOS_INICIO[item.seccion];
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex w-40 flex-col items-center justify-center gap-2 rounded-xl border border-green-100 bg-white p-6 text-center font-medium text-green-900 shadow-sm transition hover:border-green-300 hover:shadow-md dark:border-green-900/40 dark:bg-green-950/10 dark:text-green-50 dark:hover:border-green-700"
            >
              <Icono className="h-11 w-11 text-green-600 dark:text-green-400" strokeWidth={1.75} />
              {item.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
