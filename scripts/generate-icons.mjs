// Regenerable one-off script: builds PWA icons from assets/logo/logo-claro.png.
// Run with: node scripts/generate-icons.mjs
import sharp from "sharp";
import pngToIco from "png-to-ico";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
// Los iconos de la PWA (favicon, "agregar a inicio") no pueden cambiar segun
// modo claro/oscuro del sistema (el estandar de Web App Manifest no lo
// soporta) — se generan siempre desde la version clara (dron/texto en
// negro), que se lee bien sobre cualquier fondo mas o menos claro. La
// version oscura (assets/logo/logo.png) queda solo para el icono dentro de
// la app, que si respeta el tema via CSS (ver src/components/ui/Logo.tsx).
const logoPath = path.join(root, "assets", "logo", "logo-claro.png");
const iconsDir = path.join(root, "public", "icons");

const WHITE = { r: 255, g: 255, b: 255, alpha: 1 };

// El logo tiene una segunda linea de texto ("PANAMA") que lo hace mas alto
// que ancho; para un icono cuadrado se recorta solo el emblema circular,
// sin texto (asi se ve un icono limpio en vez de texto cortado a la mitad).
async function soloEmblema() {
  const metadata = await sharp(logoPath).metadata();
  const alturaRecorte = Math.round(metadata.height * 0.75);
  return sharp(logoPath).extract({
    left: 0,
    top: 0,
    width: metadata.width,
    height: alturaRecorte,
  });
}

async function plainIcon(size, outFile) {
  const emblema = await soloEmblema();
  await emblema
    .resize(size, size, { fit: "cover" })
    .flatten({ background: WHITE })
    .png()
    .toFile(path.join(iconsDir, outFile));
}

async function maskableIcon(size, outFile) {
  // Margen de seguridad: el logo se escala a ~72% y se centra sobre un
  // fondo blanco solido, para que la mascara circular de Android/iOS no
  // corte nada del logo.
  const inner = Math.round(size * 0.72);
  const emblema = await soloEmblema();
  const logoBuf = await emblema.resize(inner, inner).png().toBuffer();
  const offset = Math.round((size - inner) / 2);

  await sharp({
    create: { width: size, height: size, channels: 4, background: WHITE },
  })
    .composite([{ input: logoBuf, left: offset, top: offset }])
    .png()
    .toFile(path.join(iconsDir, outFile));
}

async function main() {
  await mkdir(iconsDir, { recursive: true });

  await plainIcon(192, "icon-192.png");
  await plainIcon(512, "icon-512.png");
  await maskableIcon(192, "icon-maskable-192.png");
  await maskableIcon(512, "icon-maskable-512.png");

  const emblemaTouch = await soloEmblema();
  await emblemaTouch
    .resize(180, 180, { fit: "cover" })
    .flatten({ background: WHITE })
    .png()
    .toFile(path.join(iconsDir, "apple-touch-icon.png"));

  const emblemaFavicon32 = await soloEmblema();
  const favicon32 = await emblemaFavicon32
    .resize(32, 32, { fit: "cover" })
    .flatten({ background: WHITE })
    .png()
    .toBuffer();
  const emblemaFavicon16 = await soloEmblema();
  const favicon16 = await emblemaFavicon16
    .resize(16, 16, { fit: "cover" })
    .flatten({ background: WHITE })
    .png()
    .toBuffer();
  await writeFile(path.join(iconsDir, "favicon-32.png"), favicon32);
  await writeFile(path.join(iconsDir, "favicon-16.png"), favicon16);

  const icoBuffer = await pngToIco([
    path.join(iconsDir, "favicon-16.png"),
    path.join(iconsDir, "favicon-32.png"),
  ]);
  await writeFile(path.join(root, "src", "app", "favicon.ico"), icoBuffer);

  console.log("Iconos generados en public/icons y src/app/favicon.ico");
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
