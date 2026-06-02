import { newMessagePath } from "../../paths.js";
import { Layout, PageFrame, SplitLayout, SplitPane } from "../../shell/index.js";
import { ActionLabel } from "../../ui/actions.js";
import { ConversationList } from "./conversations.js";
import { ConversationThread } from "./thread.js";
import type { MessagesPageProps } from "./types.js";

export function MessagesPage(props: MessagesPageProps) {
  return (
    <Layout title="Messages" user={props.user}>
      <PageFrame
        width="wide"
        title="Messages"
        actions={<a class="button" href={newMessagePath()}><ActionLabel action="send">New message</ActionLabel></a>}
      >
        <SplitLayout variant="messages">
          <SplitPane area="sidebar">
            <ConversationList
              conversations={props.conversations}
              currentHandle={props.selected?.handle}
              currentCursor={props.conversationsBefore}
              nextHref={props.conversationsNextHref}
              resetHref={props.conversationsResetHref}
              viewerId={props.user.id}
            />
          </SplitPane>
          <SplitPane area="main">
            <ConversationThread
              csrf={props.csrf}
              formMessage={props.formMessage}
              messages={props.threadMessages}
              nextHref={props.threadNextHref}
              replyBody={props.replyBody}
              replySubject={props.replySubject}
              resetHref={props.threadResetHref}
              selected={props.selected}
              viewerId={props.user.id}
            />
          </SplitPane>
        </SplitLayout>
      </PageFrame>
    </Layout>
  );
}
