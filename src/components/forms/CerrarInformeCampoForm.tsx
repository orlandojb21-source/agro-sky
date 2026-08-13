"use client";

import { useActionState, useState } from "react";
import { cerrarInformeCampoAction } from "@/lib/actions/informesCampo";
import { subirFirmaInformeCampoAction } from "@/lib/actions/informeCampoFirma";
import { Field } from "@/components/ui/Field";
import { FormError } from "@/components/ui/FormError";
import { FirmaCanvas } from "@/components/ui/FirmaCanvas";
import { SubmitButton, LinkButton } from "@/components/ui/Button";

// Cierra un Informe de Campo Particular "Abierto" -- pide las 2 firmas
// (recién acá, no al crearlo, ver migración 0085) y ya no deja agregar
// más días después de esto.
export function CerrarInformeCampoForm({ informeId }: { informeId: string }) {
  const [state, formAction] = useActionState(cerrarInformeCampoAction, { error: null });
  const v = state.values;

  const [firmaAgroRuta, setFirmaAgroRuta] = useState(v?.firmaAgroRuta ?? "");
  const [firmaClienteRuta, setFirmaClienteRuta] = useState(v?.firmaClienteRuta ?? "");

  async function subirFirmaAgro(blob: Blob): Promise<string> {
    const fd = new FormData();
    fd.append("firma", blob, "firma.png");
    const { ruta } = await subirFirmaInformeCampoAction(fd);
    return ruta;
  }
  async function subirFirmaCliente(blob: Blob): Promise<string> {
    const fd = new FormData();
    fd.append("firma", blob, "firma.png");
    const { ruta } = await subirFirmaInformeCampoAction(fd);
    return ruta;
  }

  const faltaAlgunaFirma = !firmaAgroRuta || !firmaClienteRuta;

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <FormError message={state.error} />
      <input type="hidden" name="id" value={informeId} />

      <div className="grid grid-cols-1 gap-6 rounded-xl border border-green-100 bg-white p-6 shadow-sm sm:grid-cols-2 dark:border-green-900/40 dark:bg-green-950/10">
        <div className="flex flex-col gap-3">
          <Field
            label="Nombre — Encargado Agro Sky Corp"
            name="nombreFirmaAgro"
            defaultValue={v?.nombreFirmaAgro ?? undefined}
            required
          />
          <FirmaCanvas
            label="Firma — Encargado Agro Sky Corp"
            name="firmaAgroRuta"
            rutaInicial={v?.firmaAgroRuta}
            onGuardar={subirFirmaAgro}
            onRutaCambia={setFirmaAgroRuta}
          />
        </div>
        <div className="flex flex-col gap-3">
          <Field
            label="Nombre — Encargado por parte del cliente"
            name="nombreFirmaCliente"
            defaultValue={v?.nombreFirmaCliente ?? undefined}
            required
          />
          <FirmaCanvas
            label="Firma — Encargado por parte del cliente"
            name="firmaClienteRuta"
            rutaInicial={v?.firmaClienteRuta}
            onGuardar={subirFirmaCliente}
            onRutaCambia={setFirmaClienteRuta}
          />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex gap-3">
          <SubmitButton disabled={faltaAlgunaFirma}>Cerrar informe</SubmitButton>
          <LinkButton href={`/informes/campo/${informeId}`} variant="secondary">
            Cancelar
          </LinkButton>
        </div>
        {faltaAlgunaFirma && (
          <p className="text-xs text-green-700/70 dark:text-green-300/70">
            Faltan firmas por guardar — dibuja y guarda ambas firmas antes de cerrar el informe.
          </p>
        )}
      </div>
    </form>
  );
}
