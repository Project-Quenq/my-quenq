import type { MessageItem } from "../../models.js";
import { messageFormContexts } from "../../messages.js";
import { messageDeletePath, newMessagePath, profilePath, reportPath } from "../../paths.js";
import { limits } from "../../policy.js";
import { ActionBar, ActionLabel } from "../../ui/actions.js";
import { ProfileImageLink } from "../../ui/avatars.js";
import { classNames } from "../../ui/classes.js";
import { CsrfInput, FormActions, FormError, FormField, FormStack } from "../../ui/forms.js";
import { MetaSubjectLink } from "../../ui/meta.js";
import { PaginationNav } from "../../ui/pagination.js";
import { Panel } from "../../ui/panels.js";
import { LocalizedTime } from "../../ui/time.js";
import { UserContent } from "../../ui/userContent.js";
import type { MessageParticipant } from "./types.js";

export function ConversationThread(props: {
  csrf: string;
  formMessage?: string;
  messages: MessageItem[];
  nextHref?: string | null;
  replyBody?: string;
  replySubject?: string;
  resetHref?: string | null;
  selected?: MessageParticipant;
  viewerId: number;
}) {
  if (!props.selected) {
    return (
      <Panel title="Conversation" bodyClassName="message-thread-panel">
        <p><i>Choose a conversation or start a new message.</i></p>
      </Panel>
    );
  }

  const orderedMessages = [...props.messages].reverse();
  return (
    <Panel
      className="message-thread-panel-shell"
      title={<>Conversation with <MetaSubjectLink href={profilePath(props.selected.handle)}>{props.selected.username}</MetaSubjectLink></>}
      bodyClassName="message-thread-panel"
    >
      <div class="message-thread">
        {orderedMessages.length ? orderedMessages.map((message) => (
          <MessageEntry key={message.id} csrf={props.csrf} message={message} viewerId={props.viewerId} />
        )) : <p><i>No messages in this conversation.</i></p>}
      </div>
      <PaginationNav nextHref={props.nextHref} nextLabel="Older messages" resetHref={props.resetHref} resetLabel="Newest messages" />
      <ReplyForm
        body={props.replyBody}
        csrf={props.csrf}
        message={props.formMessage}
        recipient={props.selected}
        subject={props.replySubject}
      />
    </Panel>
  );
}

function MessageEntry(props: { csrf: string; message: MessageItem; viewerId: number }) {
  const own = props.message.senderId === props.viewerId;
  const author = { handle: props.message.senderHandle, name: props.message.senderName, pfp: props.message.senderPfp };
  const utilityActions = (
    <>
      <a href={reportPath("message", props.message)}><ActionLabel action="report">Report</ActionLabel></a>
      <form method="post" action={messageDeletePath(props.message)}>
        <CsrfInput csrf={props.csrf} />
        <button class="button--danger" type="submit"><ActionLabel action="delete">Delete</ActionLabel></button>
      </form>
    </>
  );
  return (
    <article id={`message-${props.message.id}`} class={classNames("message-entry", own && "message-entry--own")}>
      <div class="message-entry__header">
        <ProfileImageLink
          alt={`${author.name}'s profile picture`}
          filename={author.pfp}
          href={profilePath(author.handle)}
          label={`View ${author.name}'s profile`}
          loading="lazy"
          variant="avatar-compact"
        />
        <div class="message-entry__meta">
          <p>
            <MetaSubjectLink href={profilePath(author.handle)}>{author.name}</MetaSubjectLink>
            {" to "}
            <MetaSubjectLink href={profilePath(props.message.receiverHandle)}>{props.message.receiverName}</MetaSubjectLink>
          </p>
          <small><LocalizedTime value={props.message.createdAt} /></small>
        </div>
      </div>
      <UserContent className="message-entry__body" html={props.message.bodyHtml} />
      <ActionBar className="message-entry__actions" secondary={utilityActions} />
    </article>
  );
}

function ReplyForm(props: { body?: string; csrf: string; message?: string; recipient: MessageParticipant; subject?: string }) {
  return (
    <div class="message-reply" id="reply">
      <h2>Reply</h2>
      <FormError>{props.message}</FormError>
      <FormStack action={newMessagePath()} className="message-reply__form">
        <CsrfInput csrf={props.csrf} />
        <input type="hidden" name="context" value={messageFormContexts.conversation} />
        <input type="hidden" name="to" value={props.recipient.handle} />
        <input type="hidden" name="subject" value={props.subject ?? ""} />
        <FormField label="Message">
          <textarea name="body" rows={5} required maxLength={limits.userText}>{props.body ?? ""}</textarea>
        </FormField>
        <FormActions>
          <button type="submit"><ActionLabel action="reply">Reply</ActionLabel></button>
        </FormActions>
      </FormStack>
    </div>
  );
}
