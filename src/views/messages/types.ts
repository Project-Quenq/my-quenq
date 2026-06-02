import type { CurrentUser } from "../../currentUser.js";
import type { MessageConversation, MessageItem } from "../../models.js";

export type MessageParticipant = {
  id: number;
  username: string;
  handle: string;
  pfp: string;
};

export type NewMessagePageProps = {
  user: CurrentUser;
  csrf: string;
  recipient?: MessageParticipant;
  recipientInput?: string;
  subject?: string;
  body?: string;
  title?: string;
  message?: string;
};

export type MessagesPageProps = {
  user: CurrentUser;
  csrf: string;
  conversations: MessageConversation[];
  conversationsBefore?: string | null;
  conversationsNextHref?: string | null;
  conversationsResetHref?: string | null;
  selected?: MessageParticipant;
  threadMessages: MessageItem[];
  threadNextHref?: string | null;
  threadResetHref?: string | null;
  formMessage?: string;
  replySubject?: string;
  replyBody?: string;
};
