/**
 * Barrel for the shared UI layer.
 *
 * Note on bundling: this file is reachable from the eagerly-loaded Home page as
 * well as from every lazy route, so anything re-exported here lands in the main
 * chunk. Keep that in mind for heavier primitives — `Modal` pulls in
 * react-dom/createPortal, so a page that only needs a dialog is better off
 * importing it directly from "./ui/Modal" than through the barrel.
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
