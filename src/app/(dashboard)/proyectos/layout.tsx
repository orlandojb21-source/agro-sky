import { requireSection } from "@/lib/session";

export default async function ProyectosLayout({ children }: { children: React.ReactNode }) {
  await requireSection("proyectos");

  return <div>{children}</div>;
}
