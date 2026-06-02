import { truncateText } from "../text.js";

export function PreviewTitleLink(props: { href: string; title: string; titleLength: number; actionLabel?: string }) {
  return (
    <>
      <span class="preview-title">{truncateText(props.title, props.titleLength)}</span> (<a href={props.href}>{props.actionLabel ?? "View more"}</a>)
    </>
  );
}
