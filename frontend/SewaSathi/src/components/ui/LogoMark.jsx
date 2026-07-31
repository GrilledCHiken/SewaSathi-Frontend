/**
 * The SewaSathi mark.
 *
 * This is the brand artwork itself, not a redrawing of it. The source lives at
 * `src/assets/images/SewaSathi-logo.png`; `tools/logo/emit.js` recolours it to
 * the site palette and writes the two variants imported below, along with every
 * favicon and app icon. Change the artwork, re-run that script — never hand-edit
 * the generated files, and never re-draw the mark in code.
 *
 * Deliberately not in `icons.jsx`. That file's whole contract is the `stroke()` /
 * `filled()` factories, which bake in a 24x24 box and `currentColor` — a raster
 * brand asset cannot go through either. This is a brand asset, not a UI icon.
 *
 * `on-dark` is a genuinely different file rather than a CSS filter: the artwork's
 * blue bottoms out around L=0.30, which disappears against the navy shells, and
 * no amount of `brightness()` recovers shading that has already collapsed.
 */

import colorSrc from "../../assets/images/logo-color.png";
import onDarkSrc from "../../assets/images/logo-on-dark.png";

const SRC = Object.freeze({
  color: colorSrc,
  "on-dark": onDarkSrc,
});

export default function LogoMark({
  size = 38,
  variant = "color",
  className = "",
  title,
}) {
  return (
    <img
      src={SRC[variant] || SRC.color}
      width={size}
      height={size}
      // The art is square and pre-centred, so the box needs no object-fit.
      alt={title || ""}
      aria-hidden={title ? undefined : "true"}
      className={className}
      draggable={false}
      decoding="async"
    />
  );
}
