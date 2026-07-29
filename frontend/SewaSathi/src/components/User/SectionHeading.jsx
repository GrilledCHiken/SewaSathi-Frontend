import Reveal from "./Reveal";

/**
 * Shared marketing section heading.
 *
 * align="center" is the page default; align="left" is used where the heading
 * shares its row with a trailing link, or sits in a two-column split.
 * tone="dark" recolours the text for the navy sections.
 */
function SectionHeading({
  eyebrow,
  title,
  description,
  align = "center",
  tone = "light",
  className = "",
}) {
  const centered = align === "center";

  return (
    <Reveal className={`${centered ? "mx-auto max-w-2xl text-center" : "max-w-xl"} ${className}`}>
      {eyebrow && (
        <p className="text-sm font-semibold uppercase tracking-wider text-brand">
          {eyebrow}
        </p>
      )}
      <h2
        className={`${eyebrow ? "mt-3" : ""} text-3xl font-bold tracking-tight sm:text-4xl ${
          tone === "dark" ? "text-white" : "text-ink"
        }`}
      >
        {title}
      </h2>
      {description && (
        <p
          className={`mt-4 text-lg leading-relaxed ${
            tone === "dark" ? "text-ink-faint" : "text-ink-muted"
          }`}
        >
          {description}
        </p>
      )}
    </Reveal>
  );
}

export default SectionHeading;
