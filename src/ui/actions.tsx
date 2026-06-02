import type { Child } from "hono/jsx";
import { classNames } from "./classes.js";
import { Icon, type IconName } from "./icons.js";

type ActionKind = "add" | "apply" | "comment" | "delete" | "edit" | "favorite" | "leave" | "lock" | "post" | "prop" | "reply" | "report" | "save" | "search" | "send" | "unlock" | "upload";

const actionIcons: Record<ActionKind, IconName> = {
  add: "add",
  apply: "check",
  comment: "comment",
  delete: "delete",
  edit: "edit",
  favorite: "favorite",
  leave: "user-minus",
  lock: "lock",
  post: "send",
  prop: "prop",
  reply: "reply",
  report: "report",
  save: "save",
  search: "search",
  send: "send",
  unlock: "unlock",
  upload: "upload"
};

export function ActionLabel(props: { action: ActionKind; children: Child }) {
  return (
    <>
      <Icon name={actionIcons[props.action]} />
      <span>{props.children}</span>
    </>
  );
}

export function ActionBar(props: { primary?: Child; secondary?: Child; className?: string }) {
  return (
    <div class={classNames("action-bar", props.className)}>
      {props.primary ? <div class="action-bar__primary">{props.primary}</div> : null}
      {props.secondary ? <div class="action-bar__secondary">{props.secondary}</div> : null}
    </div>
  );
}

export function toggleButtonClass(selected: boolean) {
  return selected ? "button--selected" : "button--secondary";
}
