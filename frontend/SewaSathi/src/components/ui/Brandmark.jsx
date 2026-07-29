import { Link } from "react-router-dom";
import { cn } from "../../utils/cn";
import { LogoIcon } from "./icons";

/**
 * Logo tile + wordmark + optional subtitle — the composite every shell wants.
 *
 * The public header, the footer, the three dashboard sidebars and the four auth
 * screens each used to assemble this by hand around their own copy of
 * `LogoIcon`, which is how the tile ended up at three different sizes.
 *
 * `tone="dark"` is for navy surfaces (sidebar rail, footer, auth aside);
 * `tone="light"` for white ones.
 */

const SIZES = Object.freeze({
  sm: { tile: "h-9 w-9", glyph: 18, word: "text-sm", sub: "text-[11px]" },
  md: { tile: "h-10 w-10", glyph: 22, word: "text-base", sub: "text-xs" },
  lg: { tile: "h-12 w-12", glyph: 26, word: "text-lg", sub: "text-xs" },
});

const TONES = Object.freeze({
  light: { word: "text-ink", sub: "text-brand" },
  dark: { word: "text-white", sub: "text-brand-300" },
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
      <span
        className={cn(
          "flex shrink-0 items-center justify-center rounded-tile bg-brand shadow-brand",
          s.tile,
        )}
      >
        <LogoIcon size={s.glyph} />
      </span>

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
