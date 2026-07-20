import Image from "next/image";

// El logo tiene dos versiones porque el dron y "PANAMÁ" van en blanco (se
// pierden en fondos claros) o en negro (se pierden en fondos oscuros):
// logo.png para modo oscuro, logo-claro.png para modo claro. Ambas se
// muestran siempre (una queda oculta con CSS segun el tema del sistema),
// dentro de un recuadro de tamaño fijo con "object-contain" para que
// ninguna se vea estirada, aunque las dos imagenes no midan lo mismo.
export function Logo({
  width,
  height,
  priority,
  className = "",
}: {
  width: number;
  height: number;
  priority?: boolean;
  className?: string;
}) {
  return (
    <span
      className={`relative inline-block shrink-0 ${className}`}
      style={{ width, height }}
    >
      <Image
        src="/logo.png"
        alt="Agro Sky Panamá"
        fill
        priority={priority}
        sizes={`${Math.max(width, height)}px`}
        className="hidden object-contain dark:block"
      />
      <Image
        src="/logo-claro.png"
        alt="Agro Sky Panamá"
        fill
        priority={priority}
        sizes={`${Math.max(width, height)}px`}
        className="object-contain dark:hidden"
      />
    </span>
  );
}
