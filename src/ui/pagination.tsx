import type { Child } from "hono/jsx";

export function PaginationNav(props: {
  nextHref?: string | null;
  nextLabel?: Child;
  resetHref?: string | null;
  resetLabel?: Child;
}) {
  if (!props.nextHref && !props.resetHref) return null;

  return (
    <nav class="pagination" aria-label="Pagination">
      {props.resetHref ? <a class="button button--secondary" href={props.resetHref}>{props.resetLabel ?? "Newest"}</a> : null}
      {props.nextHref ? <a class="button" href={props.nextHref}>{props.nextLabel ?? "Older"}</a> : null}
    </nav>
  );
}
