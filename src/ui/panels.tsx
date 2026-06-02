import type { Child } from "hono/jsx";
import { classNames } from "./classes.js";
import type { DataAttributes } from "./types.js";

type HeadingLevel = "h1" | "h2" | "h3" | "h4";
type PanelTone = "strong" | "soft";

function PanelHeading(props: { level: HeadingLevel; children: Child }) {
  switch (props.level) {
    case "h1":
      return <h1 class="flush-heading">{props.children}</h1>;
    case "h2":
      return <h2>{props.children}</h2>;
    case "h3":
      return <h3>{props.children}</h3>;
    case "h4":
      return <h4>{props.children}</h4>;
  }
}

export function Panel(props: {
  bodyClassName?: string;
  children: Child;
  className?: string;
  dataAttributes?: DataAttributes;
  headerAction?: Child;
  headingLevel?: HeadingLevel;
  id?: string;
  title: Child;
  tone?: PanelTone;
}) {
  const tone = props.tone ?? "strong";
  return (
    <div
      id={props.id}
      class={classNames("panel", `panel--${tone}`, props.className)}
      {...props.dataAttributes}
    >
      <div class="panel__heading">
        <PanelHeading level={props.headingLevel ?? "h4"}>{props.title}</PanelHeading>
        {props.headerAction ? <div class="panel__action">{props.headerAction}</div> : null}
      </div>
      <div class={classNames("panel__body", props.bodyClassName)}>{props.children}</div>
    </div>
  );
}
