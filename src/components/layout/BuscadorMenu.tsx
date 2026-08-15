"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, X } from "lucide-react";
import { canAccess, type Rol, type Seccion } from "@/lib/roles";
import { esAuditor } from "@/lib/auditoria";

type ItemBuscador = { label: string; href: string; seccion: Seccion | "auditoria"; grupo: string };

// Todas las páginas a las que se puede llegar desde algún submenú --
// además de las 9 secciones de nav-items.ts, cada una de sus pestañas
// internas (ver *SubNav.tsx en este mismo directorio). Lista a mano
// porque las rutas no se pueden descubrir en tiempo de ejecución; si se
// agrega una pestaña nueva en algún SubNav, hay que agregarla aquí
// también para que el buscador la encuentre.
const ITEMS: ItemBuscador[] = [
  { label: "Nuevos", href: "/inventario/nuevos", seccion: "inventario", grupo: "Inventario" },
  { label: "Usados", href: "/inventario/usados", seccion: "inventario", grupo: "Inventario" },
  { label: "Servicios", href: "/inventario/servicios", seccion: "inventario", grupo: "Inventario" },
  { label: "Drones", href: "/bitacora", seccion: "bitacora", grupo: "Bitácora" },
  { label: "Registro de Vuelo", href: "/bitacora/vuelos", seccion: "bitacora", grupo: "Bitácora" },
  { label: "Mantenimiento", href: "/bitacora/mantenimiento", seccion: "bitacora", grupo: "Bitácora" },
  { label: "Caja Menuda", href: "/gastos-operativos", seccion: "gastos-operativos", grupo: "Gastos Operativos" },
  { label: "Arqueos", href: "/gastos-operativos/arqueos", seccion: "gastos-operativos", grupo: "Gastos Operativos" },
  { label: "Gastos", href: "/gastos-operativos/gastos", seccion: "gastos-operativos", grupo: "Gastos Operativos" },
  { label: "Solicitudes de Compra", href: "/compras", seccion: "compras", grupo: "Compras" },
  { label: "Órdenes de Compra", href: "/compras/ordenes", seccion: "compras", grupo: "Compras" },
  { label: "Proveedores", href: "/compras/proveedores", seccion: "compras", grupo: "Compras" },
  { label: "Asistencia", href: "/planilla", seccion: "planilla", grupo: "Planilla" },
  { label: "Control de Horario", href: "/planilla/horario", seccion: "planilla", grupo: "Planilla" },
  { label: "Pagos", href: "/planilla/pagos", seccion: "planilla", grupo: "Planilla" },
  { label: "Préstamos", href: "/planilla/prestamos", seccion: "planilla", grupo: "Planilla" },
  { label: "Colaboradores", href: "/planilla/colaboradores", seccion: "planilla", grupo: "Planilla" },
  { label: "Ventas", href: "/ventas", seccion: "ventas", grupo: "Ventas" },
  { label: "Cotizaciones", href: "/ventas/cotizaciones", seccion: "ventas", grupo: "Ventas" },
  { label: "Clientes", href: "/ventas/clientes", seccion: "ventas", grupo: "Ventas" },
  { label: "Proyectos", href: "/informes/proyectos", seccion: "informes", grupo: "Proyectos" },
  { label: "Informe de Campo", href: "/informes/campo", seccion: "informes", grupo: "Proyectos" },
  { label: "Informe Diario", href: "/informes/diario", seccion: "informes", grupo: "Proyectos" },
  { label: "Análisis de Proyecto", href: "/informes/proyecto", seccion: "informes", grupo: "Proyectos" },
  { label: "Balance", href: "/balance", seccion: "balance", grupo: "Balance" },
  { label: "Usuarios", href: "/usuarios", seccion: "usuarios", grupo: "Usuarios" },
  { label: "Auditoría", href: "/auditoria", seccion: "auditoria", grupo: "Auditoría" },
];

export function BuscadorMenu({ rol, correo }: { rol: Rol; correo: string }) {
  const [abierto, setAbierto] = useState(false);
  const [consulta, setConsulta] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const contenedorRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const disponibles = ITEMS.filter((item) =>
    item.seccion === "auditoria" ? esAuditor(correo) : canAccess(rol, item.seccion),
  );

  const consultaLimpia = consulta.trim().toLowerCase();
  const resultados =
    consultaLimpia === ""
      ? []
      : disponibles.filter(
          (item) =>
            item.label.toLowerCase().includes(consultaLimpia) || item.grupo.toLowerCase().includes(consultaLimpia),
        );

  useEffect(() => {
    if (abierto) inputRef.current?.focus();
  }, [abierto]);

  useEffect(() => {
    function alClickFuera(evento: MouseEvent) {
      if (contenedorRef.current && !contenedorRef.current.contains(evento.target as Node)) {
        setAbierto(false);
        setConsulta("");
      }
    }
    document.addEventListener("mousedown", alClickFuera);
    return () => document.removeEventListener("mousedown", alClickFuera);
  }, []);

  function cerrar() {
    setAbierto(false);
    setConsulta("");
  }

  return (
    <div ref={contenedorRef} className="relative hidden sm:block">
      {abierto ? (
        <div className="flex items-center gap-1 rounded-full border border-green-300 bg-white px-3 py-1.5 dark:border-green-700 dark:bg-green-950/30">
          <Search className="h-4 w-4 shrink-0 text-green-600 dark:text-green-400" />
          <input
            ref={inputRef}
            type="text"
            value={consulta}
            onChange={(e) => setConsulta(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") cerrar();
              if (e.key === "Enter" && resultados.length > 0) {
                cerrar();
                router.push(resultados[0].href);
              }
            }}
            placeholder="Buscar menú..."
            className="w-36 bg-transparent text-sm text-green-900 outline-none placeholder:text-green-700/50 dark:text-green-50 dark:placeholder:text-green-300/50"
          />
          <button type="button" onClick={cerrar} aria-label="Cerrar búsqueda">
            <X className="h-4 w-4 text-green-600 hover:text-green-800 dark:text-green-400" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setAbierto(true)}
          aria-label="Buscar menú"
          className="rounded-full p-2 text-green-700 hover:bg-green-50 dark:text-green-300 dark:hover:bg-green-950/40"
        >
          <Search className="h-4 w-4" />
        </button>
      )}

      {abierto && consultaLimpia !== "" && (
        <div className="absolute right-0 top-full z-30 mt-1 w-64 rounded-xl border border-green-100 bg-white py-1 shadow-lg dark:border-green-900/40 dark:bg-green-950">
          {resultados.length === 0 ? (
            <p className="px-3 py-2 text-sm text-green-700/70 dark:text-green-300/70">Sin resultados.</p>
          ) : (
            resultados.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={cerrar}
                className="flex items-center justify-between gap-3 px-3 py-2 text-sm text-green-900 hover:bg-green-50 dark:text-green-50 dark:hover:bg-green-950/60"
              >
                <span>{item.label}</span>
                <span className="text-xs text-green-700/50 dark:text-green-300/50">{item.grupo}</span>
              </Link>
            ))
          )}
        </div>
      )}
    </div>
  );
}
