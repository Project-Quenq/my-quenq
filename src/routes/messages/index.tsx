import type { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { requireAuth } from "../../server/access.js";
import { csrfToken } from "../../server/auth/session.js";
import { scanAutomodSubmission } from "../../server/db/automod.js";
import {
  conversationParticipantForHandle,
  conversationsForUser,
  deleteMessageFor,
  markConversationRead,
  messagesForConversation,
  sendMessage
} from "../../server/db/messages/index.js";
import { field } from "../../server/forms.js";
import { badFormRequestMessage, localBack, requiredField, requiredUserText, routeId, verifiedActionForm } from "../../server/http.js";
import { beforeParam, paginationHref } from "../../server/pagination.js";
import { limits } from "../../policy.js";
import { messageFormContexts } from "../../messages.js";
import type { CurrentUser } from "../../currentUser.js";
import type { MessageConversation, UserProfile } from "../../models.js";
import type { AppBindings, AppContext } from "../../server/context.js";
import { MessagesPage, NewMessagePage } from "../../views/messages/index.js";
import { conversationsBeforeParam, messageConversationPath, messagesPath, newMessagePathBase } from "../../paths.js";
import { assertMessageRecipient, forwardedProfileMessage, queryRecipient, recipientHandle, visibleMessageRecipient } from "./recipients.js";

export function registerMessageRoutes(app: Hono<AppBindings>) {
  app.get(messagesPath, (c) => {
    const user = requireAuth(c);
    return messagesPage(c, user);
  });

  app.get(newMessagePathBase, (c) => {
    const user = requireAuth(c);
    return composeMessagePage(c, user);
  });

  app.post(newMessagePathBase, async (c) => {
    const user = requireAuth(c);
    const form = await verifiedActionForm(c, "message.send");
    let receiver: UserProfile | undefined;
    try {
      receiver = visibleMessageRecipient(c, field(form, "to"));
      assertMessageRecipient(user, receiver);
      const subject = requiredField(form, "subject", limits.shortText, "Subject is required.");
      const bodyHtml = requiredUserText(form, "body", limits.userText, "Message body is required.");
      const automod = scanAutomodSubmission("message", subject, bodyHtml);
      const messageId = sendMessage(user.id, receiver.id, subject, bodyHtml);
      if (!messageId) {
        const message = "Message could not be sent.";
        if (isConversationReply(form)) return messagesPage(c, user, { selectedHandle: receiver.handle, form, message }, 400);
        return composeMessageError(c, user, form, receiver, message);
      }
      automod.createReports({ subjectType: "message", subjectId: messageId, authorId: user.id });
      return c.redirect(`${messageConversationPath(receiver.handle)}#message-${messageId}`);
    } catch (error) {
      const message = badFormRequestMessage(error);
      if (message) {
        if (isConversationReply(form) && receiver) {
          return messagesPage(c, user, { selectedHandle: receiver.handle, form, message }, 400);
        }
        return composeMessageError(c, user, form, receiver, message);
      }
      throw error;
    }
  });

  app.post(`${messagesPath}/:id/delete`, async (c) => {
    const user = requireAuth(c);
    await verifiedActionForm(c, "content.write");
    if (!deleteMessageFor(user.id, routeId(c))) throw new HTTPException(404, { message: "Message not found." });
    return c.redirect(localBack(c, messagesPath));
  });
}

type MessagesPageOptions = {
  form?: Record<string, unknown>;
  message?: string;
  selectedHandle?: string;
};

function messagesPage(c: AppContext, user: CurrentUser, options: MessagesPageOptions = {}, status: 200 | 400 = 200) {
  const conversationsBefore = c.req.query(conversationsBeforeParam);
  let conversationPage = conversationsForUser(user.id, { before: conversationsBefore, limit: limits.listPage });
  const selected = selectedParticipant(c, user, options.selectedHandle ?? c.req.query("with"), conversationPage.items[0]);
  const threadBefore = c.req.query(beforeParam);

  if (selected) {
    markConversationRead(selected.id, user.id);
    conversationPage = conversationsForUser(user.id, { before: conversationsBefore, limit: limits.listPage });
  }

  const threadPage = selected ? messagesForConversation(user.id, selected.id, { before: threadBefore, limit: limits.listPage }) : null;
  const selectedConversation = selected ? conversationPage.items.find((conversation) => conversation.otherUserId === selected.id) : undefined;

  const conversationListHref = selected ? messageConversationPath(selected.handle) : messagesPath;
  const threadHref = selected ? messageConversationPath(selected.handle, conversationsBefore) : null;
  return c.html(
    <MessagesPage
      user={user}
      csrf={csrfToken(c)}
      conversations={conversationPage.items}
      conversationsBefore={conversationsBefore}
      conversationsNextHref={conversationPage.nextCursor ? paginationHref(conversationListHref, conversationPage.nextCursor, conversationsBeforeParam) : null}
      conversationsResetHref={conversationsBefore ? conversationListHref : null}
      selected={selected}
      threadMessages={threadPage?.items ?? []}
      threadNextHref={threadHref && threadPage?.nextCursor ? paginationHref(threadHref, threadPage.nextCursor) : null}
      threadResetHref={threadHref && threadBefore ? threadHref : null}
      formMessage={options.message}
      replySubject={replySubject(
        field(options.form ?? {}, "subject"),
        selectedConversation?.latestSubject ?? threadPage?.items[0]?.subject,
        selected?.username
      )}
      replyBody={field(options.form ?? {}, "body").slice(0, limits.userText)}
    />,
    status
  );
}

function composeMessagePage(c: AppContext, user: CurrentUser) {
  const recipient = queryRecipient(c);
  const forwarded = forwardedProfileMessage(c);
  const instant = c.req.query("mode") === "instant";
  const subject = (c.req.query("subject") ?? forwarded?.subject ?? (instant ? "Instant message" : "")).slice(0, limits.shortText);
  return c.html(
    <NewMessagePage
      user={user}
      csrf={csrfToken(c)}
      recipient={recipient}
      subject={subject}
      body={(forwarded?.body ?? "").slice(0, limits.userText)}
      title={instant ? "Instant message" : "Send message"}
    />
  );
}

function composeMessageError(
  c: AppContext,
  user: CurrentUser,
  form: Record<string, unknown>,
  recipient: UserProfile | undefined,
  message: string
) {
  return c.html(
    <NewMessagePage
      user={user}
      csrf={csrfToken(c)}
      recipient={recipient}
      recipientInput={field(form, "to").slice(0, limits.handleMax + 1)}
      subject={field(form, "subject").slice(0, limits.shortText)}
      body={field(form, "body").slice(0, limits.userText)}
      message={message}
    />,
    400
  );
}

function isConversationReply(form: Record<string, unknown>) {
  return field(form, "context") === messageFormContexts.conversation;
}

function selectedParticipant(c: AppContext, user: CurrentUser, handle: string | undefined, fallback?: MessageConversation) {
  if (!handle && fallback) {
    return {
      id: fallback.otherUserId,
      username: fallback.otherName,
      handle: fallback.otherHandle,
      pfp: fallback.otherPfp
    };
  }
  if (!handle) return undefined;
  const conversationParticipant = conversationParticipantForHandle(user.id, recipientHandle(handle));
  if (conversationParticipant) return conversationParticipant;
  return visibleMessageRecipient(c, handle);
}

function replySubject(draft: string, latestSubject: string | undefined, username: string | undefined) {
  if (draft) return draft.slice(0, limits.shortText);
  if (latestSubject) return latestSubject.match(/^re:/i) ? latestSubject : `Re: ${latestSubject}`.slice(0, limits.shortText);
  return username ? `Conversation with ${username}`.slice(0, limits.shortText) : "";
}
