/*
 * Produces the two colour masters from the brand artwork.
 *
 * The source is src/assets/images/SewaSathi-logo.png — the designer's file, and
 * the only thing in the repo that should ever be hand-edited. Everything else
 * this toolchain writes is derived from it.
 *
 * The art has exactly two hue families — green 80-119deg and blue 200-229deg —
 * so each is rotated onto a site-palette hue while its own lightness is left
 * alone. That preserves every gradient, highlight and shadow in the original;
 * only the hue moves. Repainting with flat fills would flatten the shading that
 * makes the mark look dimensional.
 *
 * Alpha is never touched. The source is already cut out, and its anti-aliased
 * edge pixels carry partial alpha — quantising those is exactly what produces a
 * white fringe when the logo lands on the navy sidebar.
 */
const sharp = require("sharp");
const path = require("path");

const ROOT = path.resolve(__dirname, "..", "..");
const SRC = path.join(ROOT, "frontend/SewaSathi/src/assets/images/SewaSathi-logo.png");

const TEAL_HUE = 190; // #0891b2 family — replaces the original green
const BLUE_HUE = 213; // #2b8cff family

const VARIANTS = {
  // Light surfaces. Blue gets a small lift because the artwork's navy is darker
  // than brand blue; the teal already lands in range.
  color: (l, isBlue) => (isBlue ? Math.min(0.92, l * 1.14) : l),
  // Navy surfaces. The artwork bottoms out near L=0.30, which is invisible
  // against #0f172a, so this compresses the whole range into the upper half
  // rather than simply brightening — a flat lift would blow out the highlights.
  "on-dark": (l) => Math.min(0.95, 0.3 + l * 0.65),
};

const rgb2hsl = (r, g, b) => {
  r /= 255; g /= 255; b /= 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
  let h = 0;
  if (d) {
    if (mx === r) h = ((g - b) / d) % 6;
    else if (mx === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  const l = (mx + mn) / 2;
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  return [h, s, l];
};

const hsl2rgb = (h, s, l) => {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0, g = 0, b = 0;
  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  return [Math.round((r + m) * 255), Math.round((g + m) * 255), Math.round((b + m) * 255)];
};

/** Square, transparent, centred PNG buffer for one variant. */
async function master(variant) {
  const lift = VARIANTS[variant];
  if (!lift) throw new Error(`unknown variant: ${variant}`);

  const { data, info } = await sharp(SRC).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: W, height: H, channels: C } = info;

  for (let i = 0; i < data.length; i += C) {
    if (data[i + 3] === 0) continue;
    const [h, s, l] = rgb2hsl(data[i], data[i + 1], data[i + 2]);
    if (s < 0.12) continue; // near-greys: the white seams between the fingers

    let nh = null, isBlue = false;
    if (h >= 60 && h < 160) nh = TEAL_HUE;
    else if (h >= 180 && h < 260) { nh = BLUE_HUE; isBlue = true; }
    if (nh === null) continue;

    const [r, g, b] = hsl2rgb(nh, s, lift(l, isBlue));
    data[i] = r; data[i + 1] = g; data[i + 2] = b;
  }

  // Trim to the ink, then pad back to a square so every downstream icon is
  // centred without each caller having to know the artwork's own offsets.
  const png = await sharp(data, { raw: { width: W, height: H, channels: C } }).png().toBuffer();
  const trimmed = await sharp(png).trim({ threshold: 1 }).toBuffer({ resolveWithObject: true });
  const { width: tw, height: th } = trimmed.info;
  const side = Math.max(tw, th);
  const box = side + Math.round(side * 0.04) * 2; // a little breathing room

  return sharp({
    create: { width: box, height: box, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  })
    .composite([{ input: trimmed.data, left: Math.round((box - tw) / 2), top: Math.round((box - th) / 2) }])
    .png({ compressionLevel: 9 })
    .toBuffer();
}

module.exports = { master, SRC, ROOT };
