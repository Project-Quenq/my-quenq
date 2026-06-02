import { limits, mediaAccept } from "../../policy.js";
import { ActionLabel } from "../../ui/actions.js";
import { CharacterLimitHint, CsrfInput } from "../../ui/forms.js";

export function PostComposer(props: { action: string; csrf: string; button: string }) {
  return (
    <form class="composer" method="post" action={props.action} enctype="multipart/form-data">
      <CsrfInput csrf={props.csrf} />
      <textarea name="text" rows={3} required maxLength={limits.postText}></textarea>
      <div class="composer__actions">
        <div class="composer__controls">
          <input type="file" name="media" accept={mediaAccept.image} />
          <button type="submit"><ActionLabel action="post">{props.button}</ActionLabel></button>
        </div>
        <CharacterLimitHint maxLength={limits.postText} className="composer__limit" />
      </div>
    </form>
  );
}
