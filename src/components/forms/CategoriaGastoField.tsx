"use client";

import { useState } from "react";
import { crearCategoriaGastoAction } from "@/lib/actions/categoriasGasto";
import type { ContextoCategoriaGasto } from "@/lib/categorias";
import { SelectField } from "@/components/ui/Field";

// Selector de categoría de gasto (Caja Menuda o Compras) con un
// "+ Agregar categoría nueva" propio -- cualquiera con acceso de
// escritura a esa sección puede agregar una categoría sin depender de
// una migración (pedido del usuario, 2026-08-07). La categoría se
// selecciona de inmediato al agregarla (queda editable como todo lo
// demás), pero solo se guarda en la base cuando se envía el formulario
// completo del gasto.
export function CategoriaGastoField({
  contexto,
  categoriasIniciales,
  etiquetas,
  label = "Categoría",
  name = "categoria",
  valorInicial,
  onChange,
  required = true,
}: {
  contexto: ContextoCategoriaGasto;
  categoriasIniciales: string[];
  // Solo Compras la usa, para mostrar bonitas las 6 categorías heredadas
  // (guardadas en minúsculas) -- Caja Menuda no la necesita, sus valores
  // ya son el texto a mostrar.
  etiquetas?: Record<string, string>;
  label?: string;
  name?: string;
  valorInicial?: string;
  onChange?: (valor: string) => void;
  required?: boolean;
}) {
  const [categorias, setCategorias] = useState(categoriasIniciales);
  const [valor, setValor] = useState(valorInicial ?? "");
  const [agregando, setAgregando] = useState(false);
  const [nuevaCategoria, setNuevaCategoria] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function cambiarValor(v: string) {
    setValor(v);
    onChange?.(v);
  }

  async function guardarCategoria() {
    const nombre = nuevaCategoria.trim();
    if (!nombre) return;
    setGuardando(true);
    setError(null);
    try {
      const creada = await crearCategoriaGastoAction(contexto, nombre);
      setCategorias((prev) => [...prev, creada]);
      cambiarValor(creada);
      setAgregando(false);
      setNuevaCategoria("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo agregar la categoría.");
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <SelectField
        label={label}
        name={name}
        value={valor}
        onChange={(e) => cambiarValor(e.target.value)}
        required={required}
      >
        <option value="">Selecciona...</option>
        {categorias.map((c) => (
          <option key={c} value={c}>
            {etiquetas?.[c] ?? c}
          </option>
        ))}
      </SelectField>

      {agregando ? (
        <div className="flex flex-wrap items-center gap-2">
          <input
            value={nuevaCategoria}
            onChange={(e) => setNuevaCategoria(e.target.value)}
            placeholder="Nombre de la categoría"
            className="rounded-lg border border-green-200 bg-white px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-600 dark:border-green-800 dark:bg-green-950/30"
          />
          <button
            type="button"
            onClick={guardarCategoria}
            disabled={guardando}
            className="text-sm text-green-700 hover:underline disabled:opacity-50 dark:text-green-300"
          >
            {guardando ? "Guardando..." : "Guardar"}
          </button>
          <button
            type="button"
            onClick={() => {
              setAgregando(false);
              setNuevaCategoria("");
              setError(null);
            }}
            className="text-sm text-green-700/70 hover:underline dark:text-green-300/70"
          >
            Cancelar
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setAgregando(true)}
          className="self-start text-xs text-green-700 hover:underline dark:text-green-300"
        >
          + Agregar categoría nueva
        </button>
      )}
      {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}
