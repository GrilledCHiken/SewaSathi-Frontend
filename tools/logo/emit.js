/* Writes every logo asset from the brand artwork. See README.md. */
const sharp = require("sharp");
const fs = require("fs");
const path = require("path");
const { master, ROOT } = require("./recolor");

const FE_PUBLIC = path.join(ROOT, "frontend/SewaSathi/public");
const FE_ASSETS = path.join(ROOT, "frontend/SewaSathi/src/assets/images");
const BE_ADMIN = path.join(ROOT, "backend/src/main/resources/static/admin/assets");
const BE_REPORTS = path.join(ROOT, "backend/src/main/resources/reports");

// Everything is a downscale except icon-512, which upscales the ~247x307 of ink
// in the source by about 1.7x. lanczos3 is the least mushy way to do that; a
// higher-resolution original is the only real fix.
const fit = (buf, size, opts = {}) => {
  let img = sharp(buf).resize(size, size, {
    fit: "contain",
    background: { r: 0, g: 0, b: 0, alpha: 0 },
    kernel: "lanczos3",
  });
  if (opts.pad) {
    const inner = Math.round(size * (1 - opts.pad * 2));
    const off = Math.round((size - inner) / 2);
    img = sharp(buf)
      .resize(inner, inner, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 }, kernel: "lanczos3" })
      .extend({ top: off, bottom: size - inner - off, left: off, right: size - inner - off,
                background: opts.bg || { r: 0, g: 0, b: 0, alpha: 0 } });
  }
  if (opts.flatten) img = img.flatten({ background: opts.flatten });
  return img.png({ compressionLevel: 9 }).toBuffer();
};

(async () => {
  // The artwork's own colours. Swap these for "color" / "on-dark" to go back to
  // the site-palette rotation — but change both, or the favicon stops matching
  // the mark the app renders.
  const color = await master("original");
  const onDark = await master("original-on-dark");

  const wrote = [];
  const w = (p, buf) => {
    fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.writeFileSync(p, buf);
    wrote.push(`  ${path.relative(ROOT, p).replace(/\\/g, "/")}  ${Math.round(fs.statSync(p).size / 102.4) / 10}kB`);
  };

  /* ---- imported by LogoMark.jsx, so Vite fingerprints and caches them ---- */
  w(path.join(FE_ASSETS, "logo-color.png"), color);
  w(path.join(FE_ASSETS, "logo-on-dark.png"), onDark);

  /* ---- frontend static ---- */
  w(path.join(FE_PUBLIC, "favicon.png"), await fit(color, 48));
  w(path.join(FE_PUBLIC, "icon-192.png"), await fit(color, 192));
  w(path.join(FE_PUBLIC, "icon-512.png"), await fit(color, 512));
  // iOS composites onto black if the icon has alpha, so this one gets a white plate.
  w(path.join(FE_PUBLIC, "apple-touch-icon.png"), await fit(color, 180, { pad: 0.14, bg: "#ffffff", flatten: "#ffffff" }));
  // Maskable icons get cropped to a circle; the mark stays inside the 40% safe zone.
  w(path.join(FE_PUBLIC, "icon-maskable-512.png"), await fit(onDark, 512, { pad: 0.2, bg: "#0f172a", flatten: "#0f172a" }));

  /* ---- backend admin console ---- */
  w(path.join(BE_ADMIN, "favicon.png"), await fit(color, 48));
  w(path.join(BE_ADMIN, "logo.png"), await fit(color, 128));

  /* ---- JasperReports: PNG, because Batik is not guaranteed on the 6.21 classpath ---- */
  w(path.join(BE_REPORTS, "logo.png"), await fit(color, 256));

  /* ---- social card ---- */
  const OG_W = 1200, OG_H = 630;
  const glyph = await fit(onDark, 300);
  const text = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${OG_W}" height="${OG_H}">
    <text x="600" y="452" text-anchor="middle" font-family="Inter, Segoe UI, sans-serif"
          font-size="86" font-weight="800" fill="#ffffff" letter-spacing="-2">SewaSathi</text>
    <text x="600" y="522" text-anchor="middle" font-family="Inter, Segoe UI, sans-serif"
          font-size="34" font-weight="500" fill="#8ec9ff">Trusted Home Services in Nepal</text>
  </svg>`);
  w(path.join(FE_PUBLIC, "og-image.png"),
    await sharp({ create: { width: OG_W, height: OG_H, channels: 4, background: "#0f172a" } })
      .composite([{ input: glyph, left: (OG_W - 300) / 2, top: 92 }, { input: text, left: 0, top: 0 }])
      .png({ compressionLevel: 9 })
      .toBuffer());

  /* ---- the hand-drawn SVG mark this replaced ---- */
  const stale = [
    path.join(FE_PUBLIC, "logo.svg"),
    path.join(FE_PUBLIC, "favicon.svg"),
    path.join(BE_ADMIN, "logo.svg"),
    path.join(BE_ADMIN, "favicon.svg"),
  ].filter((p) => fs.existsSync(p));
  stale.forEach((p) => fs.unlinkSync(p));

  console.log("wrote:\n" + wrote.join("\n"));
  if (stale.length) {
    console.log("removed:\n" + stale.map((p) => `  ${path.relative(ROOT, p).replace(/\\/g, "/")}`).join("\n"));
  }
})();
