import type { CurrentUser } from "../../currentUser.js";
import type { NotificationItem } from "../../models.js";
import { anchors } from "../../anchors.js";
import { commentNotificationKinds, notificationKinds, notificationTextByKind } from "../../notifications.js";
import { blogCommentsPath, blogPath, postPath, profilePath, skinCommentsPath, skinPath } from "../../paths.js";
import { Layout, PageFrame } from "../../shell/index.js";
import { ActionLabel } from "../../ui/actions.js";
import { ActorSummary, type ActorSummaryItem } from "../../ui/actors.js";
import { classNames } from "../../ui/classes.js";
import { CsrfInput } from "../../ui/forms.js";
import { PaginationNav } from "../../ui/pagination.js";
import { LocalizedTime } from "../../ui/time.js";

type NotificationGroup = {
  actors: ActorSummaryItem[];
  latest: NotificationItem;
  unread: boolean;
};

export function NotificationsPage(props: {
  user: CurrentUser;
  csrf: string;
  notifications: NotificationItem[];
  unreadCount: number;
  nextHref?: string | null;
  resetHref?: string | null;
}) {
  const groups = notificationGroups(props.notifications);
  return (
    <Layout title="Notifications" user={props.user}>
      <PageFrame title="Notifications">
        {props.unreadCount ? (
          <div class="action-bar">
            <p><b><span class="count">{props.unreadCount}</span> new {props.unreadCount === 1 ? "notification" : "notifications"}</b></p>
            <form method="post" action="/notifications" class="inline-form">
              <CsrfInput csrf={props.csrf} />
              <button type="submit"><ActionLabel action="apply">Mark all read</ActionLabel></button>
            </form>
          </div>
        ) : null}
        {groups.length ? (
          <div class="notification-list">
            {groups.map((group) => <NotificationCard key={notificationGroupKey(group.latest)} group={group} />)}
          </div>
        ) : (
          <p><i>No notifications yet.</i></p>
        )}
        <PaginationNav nextHref={props.nextHref} nextLabel="Older notifications" resetHref={props.resetHref} resetLabel="Newest notifications" />
      </PageFrame>
    </Layout>
  );
}

function NotificationCard({ group }: { group: NotificationGroup }) {
  const href = notificationHref(group.latest);
  return (
    <article class={classNames("content-card", "notification-card", group.unread ? "notification-card--unread" : undefined)}>
      <p>
        <ActorSummary actors={group.actors} /> {notificationText(group.latest)}
      </p>
      <p class="card-note notification-card__meta">
        <a href={href}>{notificationContextLabel(group.latest)}</a>
        <small><LocalizedTime value={group.latest.createdAt} /></small>
      </p>
    </article>
  );
}

function notificationGroups(items: NotificationItem[]) {
  const groups = new Map<string, NotificationGroup>();
  for (const item of items) {
    const key = notificationGroupKey(item);
    let group = groups.get(key);
    if (!group) {
      group = { actors: [], latest: item, unread: false };
      groups.set(key, group);
    }
    group.unread ||= !item.readAt;
    addNotificationActor(group, item);
  }
  return [...groups.values()];
}

function addNotificationActor(group: NotificationGroup, item: NotificationItem) {
  if (group.actors.some((actor) => actor.id === item.actorId)) return;
  group.actors.push({
    id: item.actorId,
    handle: item.actorHandle,
    name: item.actorName
  });
}

function notificationGroupKey(item: NotificationItem) {
  if (item.kind === notificationKinds.favorite) return `${item.kind}:favorites`;
  if (item.kind === notificationKinds.wallPost) return `${item.kind}:${item.subjectId}`;
  if (item.kind === notificationKinds.friendAccepted) return `${item.kind}:${item.actorId}`;
  return `${item.kind}:${item.contextType}:${item.contextId}`;
}

function notificationText(item: NotificationItem) {
  if (
    item.kind === notificationKinds.postComment &&
    item.contextPostWallUserId === item.recipientId &&
    item.contextPostAuthorId !== item.recipientId
  ) {
    return "commented on a post on your wall.";
  }
  return notificationTextByKind[item.kind];
}

function notificationHref(item: NotificationItem) {
  const commentAnchor = commentNotificationKinds.has(item.kind) ? `#${anchors.comment(item.subjectId)}` : "";
  switch (item.contextType) {
    case "blog":
      return commentAnchor ? `${blogCommentsPath(item.contextId)}${commentAnchor}` : blogPath(item.contextId);
    case "post":
      return `${postPath(item.contextId)}${commentAnchor}`;
    case "skin":
      return commentAnchor ? `${skinCommentsPath(item.contextId)}${commentAnchor}` : skinPath(item.contextId);
    case "user":
      return profilePath(item.actorHandle);
  }
}

function notificationContextLabel(item: NotificationItem) {
  switch (item.contextType) {
    case "blog":
      return item.contextTitle ? `Blog: ${item.contextTitle}` : "View blog entry";
    case "post":
      return "View post";
    case "skin":
      return item.contextTitle ? `Skin: ${item.contextTitle}` : "View skin";
    case "user":
      return "View profile";
  }
}
