import { Link } from "react-router-dom";
import { cn } from "../../utils/cn";
import LogoMark from "./LogoMark";

/**
 * Logo + wordmark + optional subtitle — the composite every shell wants: the public header,
 * the footer, the three dashboard sidebars and the auth screens.
 *
 * `LogoMark` carries its own colour and silhouette, so there is no backing tile; the glyph
 * sizes below are set to keep the optical weight of the header and sidebar rows.
 *
 * `tone="dark"` is for navy surfaces (sidebar rail, footer, auth aside); `tone="light"` for
 * white ones.
 */

const SIZES = Object.freeze({
  sm: { glyph: 34, word: "text-sm", sub: "text-[11px]" },
  md: { glyph: 38, word: "text-base", sub: "text-xs" },
  lg: { glyph: 46, word: "text-lg", sub: "text-xs" },
});

const TONES = Object.freeze({
  light: { word: "text-ink", sub: "text-brand", mark: "color" },
  dark: { word: "text-white", sub: "text-brand-300", mark: "on-dark" },
});

export default function Brandmark({
  to = "/",
  size = "md",
  tone = "light",
  subtitle,
  showWordmark = true,
  className = "",
}) {
  const s = SIZES[size] || SIZES.md;
  const t = TONES[tone] || TONES.light;

  // Renders as a plain span when `to` is null — sidebars that already sit
  // inside a nav landmark don't always want a second link to the same place.
  const Comp = to ? Link : "span";

  return (
    <Comp
      {...(to ? { to } : {})}
      className={cn(
        "flex min-w-0 items-center gap-3 rounded-field",
        to && "focus-ring transition hover:opacity-90",
        className,
      )}
    >
      <LogoMark size={s.glyph} variant={t.mark} className="shrink-0" />

      {showWordmark && (
        <span className="min-w-0">
          <span
            className={cn(
              "block truncate font-bold tracking-tight",
              s.word,
              t.word,
            )}
          >
            SewaSathi
          </span>
          {subtitle && (
            <span
              className={cn("block truncate font-semibold", s.sub, t.sub)}
            >
              {subtitle}
            </span>
          )}
        </span>
      )}
    </Comp>
  );
}
