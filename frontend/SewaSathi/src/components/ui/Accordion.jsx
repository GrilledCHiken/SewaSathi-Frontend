import { useId, useState } from "react";
import { cn } from "../../utils/cn";

/**
 * Disclosure list — the FAQ pattern hand-rolled three separate times in
 * Safety.jsx, HowItWorks.jsx and Contact.jsx, each with its own copy of the
 * `aria-expanded` / `aria-controls` wiring.
 *
 * `single` (the default) collapses the previously open item, which is what all
 * three existing call sites did. Pass `single={false}` to let several stand
 * open at once.
 *
 * The panel stays mounted and is hidden with `hidden`, so in-page search still
 * finds text inside a collapsed answer.
 */
export default function Accordion({
  items = [],
  single = true,
  defaultOpen = null,
  className = "",
}) {
  const [openKeys, setOpenKeys] = useState(() =>
    defaultOpen == null ? [] : [defaultOpen],
  );

  const toggle = (key) => {
    setOpenKeys((prev) => {
      const isOpen = prev.includes(key);
      if (single) return isOpen ? [] : [key];
      return isOpen ? prev.filter((k) => k !== key) : [...prev, key];
    });
  };

  return (
    <div className={cn("space-y-3", className)}>
      {items.map((item, index) => {
        const key = item.id ?? index;
        return (
          <AccordionItem
            key={key}
            question={item.question ?? item.title}
            answer={item.answer ?? item.body}
            open={openKeys.includes(key)}
            onToggle={() => toggle(key)}
          />
        );
      })}
    </div>
  );
}

/**
 * A single disclosure. Exported so pages with irregular content (a form inside
 * one answer, a list inside another) can compose them directly.
 */
export function AccordionItem({
  question,
  answer,
  open = false,
  onToggle,
  className = "",
  children,
}) {
  const reactId = useId();
  const panelId = `${reactId}-panel`;
  const buttonId = `${reactId}-button`;

  return (
    <div
      className={cn(
        "overflow-hidden rounded-card border bg-surface transition duration-200 ease-out-soft",
        open ? "border-brand/30 shadow-e2" : "border-line shadow-e1 hover:border-brand/25",
        className,
      )}
    >
      <h3>
        <button
          type="button"
          id={buttonId}
          aria-expanded={open}
          aria-controls={panelId}
          onClick={onToggle}
          className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left focus-ring"
        >
          <span className="font-semibold text-ink">{question}</span>
          <span
            className={cn(
              "flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition duration-200 ease-out-soft",
              open
                ? "rotate-180 bg-brand text-white"
                : "bg-surface-sunken text-ink-muted",
            )}
            aria-hidden="true"
          >
            <svg
              className="h-4 w-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M6 9l6 6 6-6" />
            </svg>
          </span>
        </button>
      </h3>

      <div id={panelId} role="region" aria-labelledby={buttonId} hidden={!open}>
        <div className="px-5 pb-5 text-sm leading-relaxed text-ink-body">
          {children ?? answer}
        </div>
      </div>
    </div>
  );
}
