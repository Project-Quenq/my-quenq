import type { ViewChild } from "./types.js";
import { classNames } from "./classes.js";
import { maxCharacterLimitLabel } from "../policy.js";

type FormMessageTone = "error" | "info" | "success";

export function CsrfInput({ csrf }: { csrf: string }) {
  return <input type="hidden" name="csrf" value={csrf} />;
}

export function FormStack(props: { action: string; actionFragment?: string; children: ViewChild; className?: string; id?: string; multipart?: boolean }) {
  return (
    <form
      id={props.id}
      action={formActionUrl(props.action, props.actionFragment)}
      class={classNames("form-stack", props.className)}
      enctype={props.multipart ? "multipart/form-data" : undefined}
      method="post"
    >
      {props.children}
    </form>
  );
}

function formActionUrl(action: string, fragment?: string) {
  if (!fragment) return action;
  return `${action.replace(/#.*$/, "")}#${encodeURIComponent(fragment)}`;
}

export function FormField(props: { children: ViewChild; hint?: ViewChild; label?: ViewChild }) {
  return (
    <label class="form-field">
      {props.label ? <span class="form-field__label">{props.label}</span> : null}
      {props.children}
      {props.hint ? <span class="form-field__hint">{props.hint}</span> : null}
    </label>
  );
}

export function FormActions(props: { children: ViewChild; className?: string; hint?: ViewChild }) {
  return (
    <div class={classNames("form-actions", props.className)}>
      {props.children}
      {props.hint ? <span class="form-actions__hint">{props.hint}</span> : null}
    </div>
  );
}

function FormMessage(props: { children: ViewChild; tone?: FormMessageTone }) {
  const tone = props.tone ?? "info";
  return (
    <p
      class={classNames(
        "form-message",
        `form-message--${tone}`,
        tone === "error" ? "form-error" : undefined,
        tone === "success" ? "form-success" : undefined
      )}
      role={tone === "error" ? "alert" : "status"}
    >
      {props.children}
    </p>
  );
}

export function FormError(props: { children?: ViewChild }) {
  return props.children ? <FormMessage tone="error">{props.children}</FormMessage> : null;
}

export function FormSuccess(props: { children?: ViewChild }) {
  return props.children ? <FormMessage tone="success">{props.children}</FormMessage> : null;
}

export function CharacterLimitHint(props: { maxLength: number; note?: ViewChild; className?: string }) {
  return (
    <small class={classNames("character-limit-hint", props.className)}>
      {maxCharacterLimitLabel(props.maxLength)}
      {props.note ? <> | {props.note}</> : null}
    </small>
  );
}
