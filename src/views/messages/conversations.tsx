import type { MessageConversation } from "../../models.js";
import { messageConversationPath } from "../../paths.js";
import { ProfileImage } from "../../ui/avatars.js";
import { CountBadge } from "../../ui/badges.js";
import { classNames } from "../../ui/classes.js";
import { PaginationNav } from "../../ui/pagination.js";
import { Panel } from "../../ui/panels.js";
import { LocalizedTime } from "../../ui/time.js";

export function ConversationList(props: {
  conversations: MessageConversation[];
  currentCursor?: string | null;
  currentHandle?: string;
  nextHref?: string | null;
  resetHref?: string | null;
  viewerId: number;
}) {
  return (
    <Panel title="Conversations" bodyClassName="message-conversation-panel" tone="soft">
      {props.conversations.length ? (
        <nav class="message-conversation-list" aria-label="Message conversations">
          {props.conversations.map((conversation) => (
            <ConversationLink
              key={conversation.otherUserId}
              conversation={conversation}
              current={conversation.otherHandle === props.currentHandle}
              currentCursor={props.currentCursor}
              viewerId={props.viewerId}
            />
          ))}
        </nav>
      ) : (
        <p><i>No conversations yet.</i></p>
      )}
      <PaginationNav nextHref={props.nextHref} nextLabel="Older conversations" resetHref={props.resetHref} resetLabel="Newest conversations" />
    </Panel>
  );
}

function ConversationLink(props: {
  conversation: MessageConversation;
  current: boolean;
  currentCursor?: string | null;
  viewerId: number;
}) {
  const unread = props.conversation.unreadCount > 0 && !props.current;
  return (
    <a
      class={classNames("message-conversation", props.current && "message-conversation--current", unread && "message-conversation--unread")}
      href={messageConversationPath(props.conversation.otherHandle, props.currentCursor)}
      aria-current={props.current ? "page" : undefined}
    >
      <ProfileImage
        alt={`${props.conversation.otherName}'s profile picture`}
        filename={props.conversation.otherPfp}
        loading="lazy"
        variant="avatar-compact"
      />
      <span class="message-conversation__summary">
        <span class="message-conversation__name">
          <span>{props.conversation.otherName}</span>
          {unread ? <CountBadge count={props.conversation.unreadCount} label={`${props.conversation.unreadCount} unread messages`} tone="attention" /> : null}
        </span>
        <small>{props.conversation.latestSenderId === props.viewerId ? "You: " : ""}{props.conversation.latestSubject}</small>
        <small><LocalizedTime value={props.conversation.createdAt} /></small>
      </span>
    </a>
  );
}
