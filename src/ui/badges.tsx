import { classNames } from "./classes.js";

function formatBadgeCount(count: number) {
  return count > 99 ? "99+" : String(count);
}

type CountBadgeTone = "default" | "attention";

export function CountBadge(props: { className?: string; count: number; label?: string; tone?: CountBadgeTone }) {
  const toneClass = props.tone && props.tone !== "default" ? `count-badge--${props.tone}` : undefined;
  return (
    <strong class={classNames("count-badge", toneClass, props.className)} aria-label={props.label}>
      {formatBadgeCount(props.count)}
    </strong>
  );
}
