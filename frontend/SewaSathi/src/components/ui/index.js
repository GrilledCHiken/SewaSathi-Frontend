/**
 * Barrel for the shared UI layer.
 *
 * Reachable from the eagerly-loaded Home page, so anything re-exported here lands in the main
 * chunk. Import heavier primitives directly — `Modal` pulls in react-dom/createPortal.
 */

export { default as Button } from "./Button";
export { default as Card, Panel } from "./Card";
export { default as Field, Input, Textarea, Select, CharCount, INPUT_BASE } from "./Field";
export { default as Badge } from "./Badge";
export { default as Alert } from "./Alert";
export { default as Spinner, LoadingBlock } from "./Spinner";
export { default as Skeleton, SkeletonText, SkeletonCard } from "./Skeleton";
export { default as EmptyState } from "./EmptyState";
export { default as StatTile } from "./StatTile";
export { default as Meter } from "./Meter";
export { default as PageShell, PageHeader } from "./PageShell";
export { default as SegmentedControl } from "./SegmentedControl";
export { default as ToggleSwitch } from "./ToggleSwitch";
export { default as RadioCard } from "./RadioCard";
export { default as Accordion, AccordionItem } from "./Accordion";
export { default as SideNav } from "./SideNav";
export { default as Brandmark } from "./Brandmark";
export { default as BackLink } from "./BackLink";
export { default as LogoMark } from "./LogoMark";

export { TONES, toneOf } from "./tones";
export { BUTTON_VARIANTS, BUTTON_SIZES } from "./button.variants";
