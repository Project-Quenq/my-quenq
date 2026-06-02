import { ActionBar, ActionLabel } from "./actions.js";
import { classNames } from "./classes.js";
import { UserContent } from "./userContent.js";
import { CharacterLimitHint, CsrfInput } from "./forms.js";
import { DiscussionEntry } from "./discussion.js";
import { Panel } from "./panels.js";
import { anchors } from "../anchors.js";
import { reportPath } from "../paths.js";
import type { CommentItem } from "../models.js";
import { limits, type ReportSubjectType } from "../policy.js";
import { canModerateTarget } from "../roles.js";
import type { CurrentUser } from "../currentUser.js";

export function CommentForm(props: {
  action: string;
  csrf: string;
  button?: string;
  maxLength?: number;
  parentId?: number;
  rows?: number;
}) {
  const label = props.button ?? "Add comment";
  const maxLength = props.maxLength ?? limits.userText;
  return (
    <form class={classNames("composer", props.parentId ? "composer--reply" : undefined)} method="post" action={props.action}>
      <CsrfInput csrf={props.csrf} />
      {props.parentId ? <input type="hidden" name="parentId" value={props.parentId} /> : null}
      <textarea name="text" rows={props.rows ?? 3} required maxLength={maxLength}></textarea>
      <div class="composer__actions">
        <div class="composer__submit">
          <button type="submit"><ActionLabel action={props.parentId ? "reply" : "comment"}>{label}</ActionLabel></button>
          <CharacterLimitHint maxLength={maxLength} className="composer__limit" />
        </div>
      </div>
    </form>
  );
}

export function CommentList(props: {
  comments: CommentItem[];
  user?: CurrentUser | null;
  csrf?: string;
  deleteOwnerIds?: readonly number[];
  deleteAction?: string;
  replyAction?: string;
  reportType?: ReportSubjectType;
}) {
  if (!props.comments.length) return <p><i>No comments yet.</i></p>;

  return (
    <div class="discussion-list">
      {props.comments.map((comment) => {
        const user = props.user;
        const deleteForm =
          user && props.csrf && props.deleteAction && canDeleteComment(user, comment, props.deleteOwnerIds)
            ? { action: `${props.deleteAction}/${comment.id}/delete`, csrf: props.csrf }
            : undefined;
        const reply = user && props.csrf && props.replyAction && comment.parentId === null ? { action: props.replyAction, csrf: props.csrf } : undefined;
        const replyAction = reply ? (
          <details class="reply-action">
            <summary class="button"><ActionLabel action="reply">Reply</ActionLabel></summary>
            <CommentForm action={reply.action} csrf={reply.csrf} parentId={comment.id} button="Post reply" />
          </details>
        ) : null;
        const hasUtilityActions = Boolean(props.reportType || deleteForm);
        const utilityActions = hasUtilityActions ? (
          <>
            {props.reportType ? <a href={reportPath(props.reportType, comment)}><ActionLabel action="report">Report</ActionLabel></a> : null}
            {deleteForm ? (
              <form method="post" action={deleteForm.action}>
                <CsrfInput csrf={deleteForm.csrf} />
                <button class="button--danger" type="submit"><ActionLabel action="delete">Delete</ActionLabel></button>
              </form>
            ) : null}
          </>
        ) : null;
        return (
          <DiscussionEntry
            key={comment.id}
            authorId={comment.authorId}
            authorHandle={comment.authorHandle}
            className={comment.parentId ? "discussion-entry--reply" : undefined}
            createdAt={comment.createdAt}
            id={anchors.comment(comment)}
            authorSkinHtml={comment.authorSkinHtml}
            pfp={comment.pfp}
            username={comment.username}
          >
            <UserContent html={comment.textHtml} />
            {replyAction || utilityActions ? (
              <ActionBar className="discussion-entry__actions" primary={replyAction ?? undefined} secondary={utilityActions ?? undefined} />
            ) : null}
          </DiscussionEntry>
        );
      })}
    </div>
  );
}

function canDeleteComment(user: CurrentUser, comment: CommentItem, ownerIds: readonly number[] | undefined) {
  return (
    user.id === comment.authorId ||
    Boolean(ownerIds?.includes(user.id)) ||
    canModerateTarget(user, { id: comment.authorId, role: comment.authorRole })
  );
}

export function CommentPanel(props: {
  action: string;
  comments: CommentItem[];
  csrf: string;
  deleteAction: string;
  deleteOwnerIds: readonly number[];
  fullComments?: boolean;
  fullHref?: string;
  reportType: ReportSubjectType;
  title?: string;
  user: CurrentUser | null;
}) {
  return (
    <Panel className="comments-panel" id={anchors.comments} title={props.title ?? "Comments"} tone="soft">
      {props.fullHref ? (
        <p>
          <b>
            Displaying <span class="count">{props.comments.length}</span> comments
            {!props.fullComments && props.comments.length ? <> ( <a href={props.fullHref}>View all</a> )</> : null}
          </b>
        </p>
      ) : null}
      {props.user ? <CommentForm action={props.action} csrf={props.csrf} /> : <p><a href="/login">Log in</a> to add a comment.</p>}
      <CommentList
        comments={props.comments}
        user={props.user}
        csrf={props.csrf}
        deleteOwnerIds={props.deleteOwnerIds}
        deleteAction={props.deleteAction}
        replyAction={props.action}
        reportType={props.reportType}
      />
    </Panel>
  );
}
