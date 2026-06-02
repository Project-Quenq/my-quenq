import { profilePath } from "../paths.js";
import { MetaSubjectLink } from "./meta.js";

export type ActorSummaryItem = {
  handle: string;
  id?: number | string | null;
  name: string;
};

export function ActorSummary(props: { actors: ActorSummaryItem[]; hiddenCount?: number; maxVisible?: number }) {
  const visible = props.actors.slice(0, props.maxVisible ?? 3);
  const hidden = Math.max(0, props.actors.length - visible.length) + (props.hiddenCount ?? 0);
  return (
    <>
      {visible.map((actor, index) => (
        <span key={actor.id ?? actor.handle}>
          {actorSeparator(index, visible.length, hidden)}
          <MetaSubjectLink href={profilePath(actor.handle)}>{actor.name}</MetaSubjectLink>
        </span>
      ))}
      {hidden ? (
        <>
          {visible.length ? " and " : null}
          <span>{hidden} other {hidden === 1 ? "person" : "people"}</span>
        </>
      ) : null}
    </>
  );
}

function actorSeparator(index: number, visibleCount: number, hiddenCount: number) {
  if (index === 0) return null;
  if (!hiddenCount && index === visibleCount - 1) return " and ";
  return ", ";
}
