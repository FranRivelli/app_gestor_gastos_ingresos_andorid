// One-off script: regenerates app icon/splash variants from assets/logo.png.
// Run manually with `node scripts/generate-icons.js` whenever logo.png changes.
const sharp = require("sharp");
const path = require("path");
const fs = require("fs");

const ASSETS = path.join(__dirname, "..", "assets");
const SRC = path.join(ASSETS, "logo.png");
const BG = "#12151C";

async function main() {
  const srcBuffer = await sharp(SRC).toBuffer();

  // Re-encode the source itself as a real PNG (it may currently be JPEG bytes
  // wearing a .png extension), square, for use in the login screen.
  const logoTmp = path.join(ASSETS, "logo.tmp.png");
  await sharp(srcBuffer)
    .resize(1024, 1024, { fit: "contain", background: BG })
    .png()
    .toFile(logoTmp);
  fs.renameSync(logoTmp, path.join(ASSETS, "logo.png"));

  // App icon: opaque square, logo padded on brand background.
  await sharp(srcBuffer)
    .resize(1024, 1024, { fit: "contain", background: BG })
    .flatten({ background: BG })
    .png()
    .toFile(path.join(ASSETS, "icon.png"));

  // Android adaptive icon foreground: logo centered in the safe zone
  // (roughly 66% of the canvas) on a transparent background.
  const fg = await sharp(srcBuffer)
    .resize(680, 680, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toBuffer();
  await sharp({
    create: {
      width: 1024,
      height: 1024,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([{ input: fg, gravity: "center" }])
    .png()
    .toFile(path.join(ASSETS, "adaptive-icon.png"));

  // Splash screen image: logo on transparent background, moderate size.
  const splashFg = await sharp(srcBuffer)
    .resize(420, 420, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toBuffer();
  await sharp({
    create: {
      width: 1200,
      height: 1200,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([{ input: splashFg, gravity: "center" }])
    .png()
    .toFile(path.join(ASSETS, "splash-icon.png"));

  // Web favicon.
  await sharp(srcBuffer)
    .resize(196, 196, { fit: "contain", background: BG })
    .flatten({ background: BG })
    .png()
    .toFile(path.join(ASSETS, "favicon.png"));

  console.log("Iconos y splash regenerados en assets/.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
