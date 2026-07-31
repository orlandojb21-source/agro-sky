// Reescala en un canvas y reexporta como JPEG antes de subir a Storage --
// una foto de celular sin comprimir puede pesar 3-5 MB; esto la deja
// típicamente en ~100-250 KB sin importar el tamaño original (mismo
// principio que cargarLogoBase64() en lib/exportar.ts).
const ANCHO_MAXIMO_PX = 800;
const CALIDAD_JPEG = 0.8;

export async function comprimirImagen(archivo: File): Promise<Blob> {
  const objectUrl = URL.createObjectURL(archivo);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("No se pudo leer la imagen"));
      el.src = objectUrl;
    });

    const escala = Math.min(1, ANCHO_MAXIMO_PX / Math.max(img.width, img.height));
    const ancho = Math.round(img.width * escala);
    const alto = Math.round(img.height * escala);

    const canvas = document.createElement("canvas");
    canvas.width = ancho;
    canvas.height = alto;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("No se pudo procesar la imagen");
    ctx.drawImage(img, 0, 0, ancho, alto);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", CALIDAD_JPEG),
    );
    if (!blob) throw new Error("No se pudo comprimir la imagen");
    return blob;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}
