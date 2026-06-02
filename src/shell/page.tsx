import { classNames } from "../ui/classes.js";
import type { DataAttributes, ViewChild } from "../ui/types.js";

type HeadingLevel = "h1" | "h2" | "h3" | "h4";

export type PageFrameWidth = "narrow" | "wide" | "full";
export type SplitLayoutVariant = "landing" | "dashboard" | "profile" | "article" | "editor" | "messages";
export type SplitPaneArea = "main" | "aside" | "sidebar";

export function PageFrame(props: {
  actions?: ViewChild;
  back?: ViewChild;
  children?: ViewChild;
  className?: string;
  title?: ViewChild;
  titleLevel?: HeadingLevel;
  width?: PageFrameWidth;
}) {
  const width = props.width ?? "narrow";
  return (
    <div class={classNames("page-frame", `page-frame--${width}`, props.className)}>
      {props.back}
      {props.title ? <PageHeading actions={props.actions} level={props.titleLevel}>{props.title}</PageHeading> : null}
      {props.children}
    </div>
  );
}

export function PageHeading(props: { actions?: ViewChild; children: ViewChild; className?: string; level?: HeadingLevel }) {
  return (
    <div class={classNames("page-heading", props.className)}>
      <Heading className="page-heading__title" level={props.level ?? "h1"}>{props.children}</Heading>
      {props.actions ? <div class="page-heading__actions">{props.actions}</div> : null}
    </div>
  );
}

function Heading(props: { children: ViewChild; className?: string; level: HeadingLevel }) {
  switch (props.level) {
    case "h1":
      return <h1 class={props.className}>{props.children}</h1>;
    case "h2":
      return <h2 class={props.className}>{props.children}</h2>;
    case "h3":
      return <h3 class={props.className}>{props.children}</h3>;
    case "h4":
      return <h4 class={props.className}>{props.children}</h4>;
  }
}

export function SplitLayout(props: {
  children: ViewChild;
  className?: string;
  dataAttributes?: DataAttributes;
  itemscope?: boolean;
  itemtype?: string;
  variant: SplitLayoutVariant;
}) {
  return (
    <div
      class={classNames("split-layout", `split-layout--${props.variant}`, props.className)}
      itemscope={props.itemscope}
      itemtype={props.itemtype}
      {...props.dataAttributes}
    >
      {props.children}
    </div>
  );
}

export function SplitPane(props: { area: SplitPaneArea; children: ViewChild; className?: string; dataAttributes?: DataAttributes }) {
  return (
    <div class={classNames("split-layout__pane", `split-layout__${props.area}`, props.className)} {...props.dataAttributes}>
      {props.children}
    </div>
  );
}
