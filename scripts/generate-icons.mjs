// Regenerable one-off script: builds PWA icons from assets/logo/logo.png.
// Run with: node scripts/generate-icons.mjs
import sharp from "sharp";
import pngToIco from "png-to-ico";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const logoPath = path.join(root, "assets", "logo", "logo.png");
const iconsDir = path.join(root, "public", "icons");

const WHITE = { r: 255, g: 255, b: 255, alpha: 1 };

async function plainIcon(size, outFile) {
  await sharp(logoPath)
    .resize(size, size, { fit: "cover" })
    .png()
    .toFile(path.join(iconsDir, outFile));
}

async function maskableIcon(size, outFile) {
  // Margen de seguridad: el logo se escala a ~72% y se centra sobre un
  // fondo blanco solido, para que la mascara circular de Android/iOS no
  // corte nada del logo.
  const inner = Math.round(size * 0.72);
  const logoBuf = await sharp(logoPath).resize(inner, inner).png().toBuffer();
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

  await sharp(logoPath)
    .resize(180, 180, { fit: "cover" })
    .flatten({ background: WHITE })
    .png()
    .toFile(path.join(iconsDir, "apple-touch-icon.png"));

  const favicon32 = await sharp(logoPath).resize(32, 32).png().toBuffer();
  const favicon16 = await sharp(logoPath).resize(16, 16).png().toBuffer();
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
