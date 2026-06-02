import { ActionLabel, toggleButtonClass } from "./actions.js";
import { CsrfInput } from "./forms.js";

function pluralize(count: number, singular: string, plural = `${singular}s`) {
  return count === 1 ? singular : plural;
}

export function PropAction(props: {
  action: string;
  count: number;
  csrf: string;
  propped: boolean;
}) {
  const label = pluralize(props.count, "Prop");

  return (
    <form method="post" action={props.action} class="inline-form">
      <CsrfInput csrf={props.csrf} />
      <button
        aria-label={props.propped ? "Remove props" : "Give props"}
        aria-pressed={props.propped ? "true" : "false"}
        class={toggleButtonClass(props.propped)}
        type="submit"
      >
        <PropLabel count={props.count} label={label} />
      </button>
    </form>
  );
}

export function PropCount(props: { count: number; propped?: boolean }) {
  return (
    <span class={`button ${toggleButtonClass(Boolean(props.propped))} prop-count`}>
      <PropLabel count={props.count} label={pluralize(props.count, "Prop")} />
    </span>
  );
}

function PropLabel({ count, label }: { count: number; label: string }) {
  return <ActionLabel action="prop">{count} {label}</ActionLabel>;
}
