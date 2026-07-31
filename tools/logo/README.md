# Brand asset generator

The logo is the designer's artwork at
`frontend/SewaSathi/src/assets/images/SewaSathi-logo.png`. That file is the only
thing here anyone should hand-edit. `emit.js` recolours it to the site palette
and writes all eleven derived assets.

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

## The recolour

The artwork has exactly two hue families, green 80–119° and blue 200–229°.
`recolor.js` rotates each onto a site-palette hue and leaves its lightness
alone, so every gradient and highlight in the original survives — only the hue
moves. Flat fills would kill the shading that makes the mark look dimensional.

Alpha is never touched. The source is already cut out and its edge pixels carry
partial alpha; quantising those is what produces a white fringe on navy.

`on-dark` is a separate file rather than a CSS filter. The artwork's blue bottoms
out near L=0.30, invisible against `#0f172a`, so that variant compresses the
whole lightness range into the upper half. A flat `brightness()` blows out the
highlights instead.

## Resolution ceiling

The source contains about **247×307 pixels of actual ink**. Everything is a
downscale from that except `icon-512.png`, which upscales roughly 1.7× and is
correspondingly soft. `lanczos3` is the least-bad way to do it, but the only
real fix is a higher-resolution original — ideally the vector the artwork was
exported from. If one turns up, drop it in and this script can emit true SVG
assets instead of PNGs.
