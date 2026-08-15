import { redirect } from "next/navigation";
import { requirePerfil } from "@/lib/session";
import { esAuditor } from "@/lib/auditoria";
import { createClient } from "@/lib/supabase/server";
import { NAV } from "@/components/layout/nav-items";
import { AuditoriaTabla, type EventoAuditoria } from "@/components/forms/AuditoriaTabla";

const LIMITE = 500;

function etiquetaSeccion(seccion: string): string {
  return NAV.find((item) => item.seccion === seccion)?.label ?? seccion;
}

export default async function AuditoriaPage() {
  const perfil = await requirePerfil();
  if (!esAuditor(perfil.email)) {
    redirect("/unauthorized");
  }

  const supabase = await createClient();
  const { data } = await supabase
    .from("auditoria_acciones")
    .select("id, usuario_nombre, correo, seccion, creado_en")
    .order("creado_en", { ascending: false })
    .limit(LIMITE);

  const eventos: EventoAuditoria[] = (data ?? []).map((r) => ({
    id: r.id as string,
    usuarioNombre: r.usuario_nombre as string,
    correo: r.correo as string,
    seccionLabel: etiquetaSeccion(r.seccion as string),
    creadoEn: r.creado_en as string,
  }));

  return <AuditoriaTabla eventos={eventos} limite={LIMITE} />;
}
