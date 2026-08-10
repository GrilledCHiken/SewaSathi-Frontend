# Brand asset generator

The logo is the designer's artwork at
`frontend/SewaSathi/src/assets/images/SewaSathi-logo.png`. That file is the only
thing here anyone should hand-edit. `emit.js` squares it and writes all eleven
derived assets.

```sh
cd tools/logo
npm install
npm run emit
```

## What it writes

| File | Notes |
| --- | --- |
| `src/assets/images/logo-color.png` | imported by `LogoMark.jsx`, so Vite fingerprints it |
| `src/assets/images/logo-on-dark.png` | same, for navy shells |
| `public/favicon.png` | 48px |
| `public/icon-192.png` | PWA |
| `public/icon-512.png` | PWA |
| `public/icon-maskable-512.png` | navy plate, mark inside the 40% safe zone |
| `public/apple-touch-icon.png` | white plate — iOS composites alpha onto black |
| `public/og-image.png` | 1200x630 social card |
| `backend/.../static/admin/assets/logo.png` | admin console |
| `backend/.../static/admin/assets/favicon.png` | admin console |
| `backend/.../reports/logo.png` | JasperReports |

It also deletes `logo.svg` / `favicon.svg` from both static directories if they
reappear. Those were a hand-drawn *replica* of the mark that predated this
toolchain — a different S, drawn in code. If you find yourself re-creating them,
you are solving the wrong problem.

## Variants

`recolor.js` exposes four, and `emit.js` picks two of them — one for light
surfaces, one for navy. **Both must come from the same family**, or the browser
tab stops matching the mark the app renders, which is the bug this arrangement
exists to prevent.

| Variant | Hue | Lightness |
| --- | --- | --- |
| `original` | untouched | untouched |
| `original-on-dark` | untouched | lifted for navy |
| `color` | rotated to site palette | untouched |
| `on-dark` | rotated to site palette | lifted for navy |

**The site currently ships `original` / `original-on-dark`** — the designer's own
colours. The palette rotation is kept because it is the non-obvious part and
re-deriving it later would be wasted work; switch back by changing the two
`master(...)` calls at the top of `emit.js`.

Every variant, identity included, is trimmed to its ink and padded back to a
square. That is not cosmetic: the source is 432×327 and `LogoMark` renders into
a square box, so an unsquared master is stretched at every call site.

### The recolour

The artwork has exactly two hue families, green 80–119° and blue 200–229°. A
rotating variant moves each onto a site-palette hue and leaves its lightness
alone, so every gradient and highlight in the original survives — only the hue
moves. Flat fills would kill the shading that makes the mark look dimensional.

Alpha is never touched. The source is already cut out and its edge pixels carry
partial alpha; quantising those is what produces a white fringe on navy.

### The on-dark lift

`on-dark` is a separate file rather than a CSS filter. The artwork's ink runs
L=0.13–0.51 with a median of 0.36 — barely separable from `#0f172a` — so those
variants compress the whole lightness range into the upper half. A flat
`brightness()` blows out the highlights instead.

## Resolution ceiling

The source contains about **247×307 pixels of actual ink**. Everything is a
downscale from that except `icon-512.png`, which upscales roughly 1.7× and is
correspondingly soft. `lanczos3` is the least-bad way to do it, but the only
real fix is a higher-resolution original — ideally the vector the artwork was
exported from. If one turns up, drop it in and this script can emit true SVG
assets instead of PNGs.
