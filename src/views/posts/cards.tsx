import type { PostItem } from "../../models.js";
import { anchors } from "../../anchors.js";
import { canModerateTarget } from "../../roles.js";
import type { CurrentUser } from "../../currentUser.js";
import { ActionBar, ActionLabel } from "../../ui/actions.js";
import { ActorSummary } from "../../ui/actors.js";
import { UserContent } from "../../ui/userContent.js";
import { PropAction, PropCount } from "../../ui/engagement.js";
import { CsrfInput } from "../../ui/forms.js";
import { MetaSubjectLink } from "../../ui/meta.js";
import { ProfileImageLink } from "../../ui/avatars.js";
import { AuthorSkinBoundary, profileSkinPart } from "../../skins/rendering.js";
import { groupPath, postImagePath, postPath, profilePath, reportPath } from "../../paths.js";
import { LocalizedTime } from "../../ui/time.js";

export type PostSkinSource = "author" | "surrounding-profile";

export function PostList(props: {
  skinSource?: PostSkinSource;
  user: CurrentUser | null;
  csrf: string;
  posts: PostItem[];
  empty: string;
  canInteract?: boolean;
}) {
  return (
    <div class="post-list">
      {props.posts.length ? props.posts.map((post) => (
        <PostCard
          key={post.id}
          skinSource={props.skinSource}
          user={props.user}
          csrf={props.csrf}
          post={post}
          canInteract={postCanInteract(post, props.canInteract)}
        />
      )) : <p><i>{props.empty}</i></p>}
    </div>
  );
}

export function PostCard(props: {
  skinSource?: PostSkinSource;
  user: CurrentUser | null;
  csrf: string;
  post: PostItem;
  canInteract?: boolean;
}) {
  const post = props.post;
  const canDelete = canDeletePost(props.user, post);
  const canInteract = props.canInteract ?? Boolean(post.viewerCanInteract);
  const href = postPath(post);
  const authorSkinHtml = (props.skinSource ?? "author") === "author" ? post.authorSkinHtml : null;
  const engagementActions = (
    <>
      {props.user && canInteract ? (
        <PropAction
          action={`${href}/${post.proppedByViewer ? "unprop" : "prop"}`}
          csrf={props.csrf}
          count={post.propCount}
          propped={Boolean(post.proppedByViewer)}
        />
      ) : (
        <PropCount count={post.propCount} propped={Boolean(post.proppedByViewer)} />
      )}
      <a href={href}><ActionLabel action="comment">{post.commentCount} {post.commentCount === 1 ? "comment" : "comments"}</ActionLabel></a>
    </>
  );
  const utilityActions = (
    <>
      <a href={reportPath("post", post)}><ActionLabel action="report">Report</ActionLabel></a>
      {canDelete ? (
        <form method="post" action={`${href}/delete`} class="inline-form">
          <CsrfInput csrf={props.csrf} />
          <button class="button--danger" type="submit"><ActionLabel action="delete">Delete</ActionLabel></button>
        </form>
      ) : null}
    </>
  );
  return (
    <AuthorSkinBoundary skinHtml={authorSkinHtml} contextParts={["wall"]} backdrop="container">
      <article id={anchors.post(post)} class="post-card" data-author-skin-part="post" {...profileSkinPart("post")}>
        <CommentBumpLabel post={post} href={href} />
        <div class="post-card__header">
          <ProfileImageLink
            alt={`${post.username}'s profile picture`}
            filename={post.pfp}
            href={profilePath(post.authorHandle)}
            label={`View ${post.username}'s profile`}
            loading="lazy"
            variant="avatar-compact"
          />
          <div class="post-card__meta">
            <p>
              <MetaSubjectLink href={profilePath(post.authorHandle)}>{post.username}</MetaSubjectLink>{contextLabel(post)}
            </p>
            <small><a href={href}><LocalizedTime value={post.createdAt} /></a></small>
          </div>
        </div>
        <UserContent className="post-card__body" html={post.bodyHtml} />
        {post.mediaFilename ? <PostImage filename={post.mediaFilename} /> : null}
        <ActionBar className="post-card__actions" primary={engagementActions} secondary={utilityActions} />
      </article>
    </AuthorSkinBoundary>
  );
}

function CommentBumpLabel({ post, href }: { post: PostItem; href: string }) {
  const bump = post.commentBump;
  if (!bump?.commentedAt || !bump.actors.length || bump.commenterCount < 1) return null;

  const hiddenCount = Math.max(0, bump.commenterCount - bump.actors.length);
  return (
    <p class="post-card__bump">
      <ActorSummary actors={bump.actors} hiddenCount={hiddenCount} /> commented on this post{" "}
      <span class="post-card__bump-separator" aria-hidden="true">&middot;</span>{" "}
      <small><a href={`${href}#${anchors.comments}`}><LocalizedTime value={bump.commentedAt} /></a></small>
    </p>
  );
}

function PostImage({ filename }: { filename: string }) {
  return <img class="post-card__media" src={postImagePath(filename)} alt="post image" loading="lazy" />;
}

function contextLabel(post: PostItem) {
  if (post.groupId && post.groupName) return <> in <MetaSubjectLink href={groupPath(post.groupId)}>{post.groupName}</MetaSubjectLink></>;
  if (post.wallUserId && post.wallUsername && post.wallUserHandle && post.wallUserId !== post.authorId) {
    return <> on <MetaSubjectLink href={profilePath(post.wallUserHandle)}>{post.wallUsername}'s wall</MetaSubjectLink></>;
  }
  return null;
}

function canDeletePost(user: CurrentUser | null, post: PostItem) {
  return Boolean(
    user &&
      (user.id === post.authorId ||
        user.id === post.wallUserId ||
        user.id === post.groupOwnerId ||
        canModerateTarget(user, { id: post.authorId, role: post.authorRole }))
  );
}

function postCanInteract(post: PostItem, override: boolean | undefined) {
  return override ?? Boolean(post.viewerCanInteract);
}
