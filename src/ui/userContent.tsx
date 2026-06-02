import { classNames } from "./classes.js";
import { trustedHtml } from "./html.js";
import type { DataAttributes } from "./types.js";

export function UserContent(props: { className?: string; dataAttributes?: DataAttributes; html: string; itemprop?: string }) {
  return (
    <div
      class={classNames("user-content", props.className)}
      itemprop={props.itemprop}
      {...props.dataAttributes}
      dangerouslySetInnerHTML={trustedHtml(props.html)}
    />
  );
}
