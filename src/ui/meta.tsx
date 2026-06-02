import type { Child } from "hono/jsx";

export function MetaSubject(props: { children: Child }) {
  return <span class="meta-subject">{props.children}</span>;
}

export function MetaSubjectLink(props: { children: Child; href: string }) {
  return <a class="meta-subject" href={props.href}>{props.children}</a>;
}
