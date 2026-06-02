import type { Child } from "hono/jsx";
import { classNames } from "./classes.js";
import { MetaSubjectLink } from "./meta.js";
import { ProfileImageLink } from "./avatars.js";
import { AuthorSkinBoundary, profileSkinPart } from "../skins/rendering.js";
import { profilePath } from "../paths.js";
import { LocalizedTime } from "./time.js";

export function DiscussionEntry(props: {
  authorId: number;
  authorHandle: string;
  authorSkinHtml: string;
  children: Child;
  className?: string;
  createdAt: string;
  id?: string;
  pfp: string;
  username: string;
}) {
  return (
    <AuthorSkinBoundary skinHtml={props.authorSkinHtml} contextParts={["wall"]} backdrop="item">
      <article id={props.id} class={classNames("discussion-entry", props.className)} data-author-skin-part="comment" {...profileSkinPart("comment")}>
        <div class="discussion-entry__author">
          <ProfileImageLink
            alt={`${props.username}'s profile picture`}
            filename={props.pfp}
            href={profilePath(props.authorHandle)}
            label={`View ${props.username}'s profile`}
            loading="lazy"
            variant="avatar-compact"
          />
          <MetaSubjectLink href={profilePath(props.authorHandle)}>{props.username}</MetaSubjectLink>
        </div>
        <div class="discussion-entry__body">
          <div class="discussion-entry__meta"><LocalizedTime value={props.createdAt} /></div>
          {props.children}
        </div>
      </article>
    </AuthorSkinBoundary>
  );
}
