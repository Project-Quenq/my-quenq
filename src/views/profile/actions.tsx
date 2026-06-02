import type { UserProfile } from "../../models.js";
import { anchors } from "../../anchors.js";
import { canModerateTarget, isAdminUser } from "../../roles.js";
import type { CurrentUser } from "../../currentUser.js";
import { newMessagePath, reportPath } from "../../paths.js";
import { classNames } from "../../ui/classes.js";
import { CsrfInput } from "../../ui/forms.js";
import { Icon, type IconName } from "../../ui/icons.js";
import { Panel } from "../../ui/panels.js";
import type { ViewChild } from "../../ui/types.js";
import { profileSkinPart } from "../../skins/rendering.js";

type ProfileActionProps = {
  user: CurrentUser | null;
  csrf: string;
  profile: UserProfile;
  isFriend: boolean;
  pendingSent: boolean;
  pendingReceived: boolean;
  ownProfile: boolean;
  blockedByMe: boolean;
  protectedAdminProfile: boolean;
};

type FriendAction = {
  action: "add" | "accept" | "remove";
  icon: IconName;
  label: string;
  disabled?: boolean;
  variant?: ProfileActionVariant;
};

type ProfileActionVariant = "danger" | "secondary";

export function ProfileActionsPanel(props: ProfileActionProps) {
  const friendAction: FriendAction = props.isFriend
    ? { action: "remove", icon: "delete", label: "Remove friend", variant: "danger" }
    : props.pendingReceived
      ? { action: "accept", icon: "check", label: "Accept friend request" }
      : { action: "add", icon: "add", label: props.pendingSent ? "Pending request" : "Add to friends", disabled: props.pendingSent };
  const canModerateProfile = Boolean(props.user && !props.ownProfile && canModerateTarget(props.user, props.profile));

  return (
    <Panel id={anchors.profileActions} className="profile__actions-panel profile-card" dataAttributes={profileSkinPart("actions")} title="Profile actions">
      <div class="profile-actions">
        <ActionCell>
          {props.ownProfile ? <ProfileActionLink href="/account/profile" icon="user">Edit profile</ProfileActionLink> : props.user && props.protectedAdminProfile ? (
            <ProfileActionLabel disabled icon="user">Friend</ProfileActionLabel>
          ) : props.user ? (
            <form action="/friends" method="post">
              <CsrfInput csrf={props.csrf} />
              <input type="hidden" name="id" value={props.profile.id} />
              <input type="hidden" name="action" value={friendAction.action} />
              <ProfileActionButton disabled={friendAction.disabled} icon={friendAction.icon} variant={friendAction.variant}>
                {friendAction.label}
              </ProfileActionButton>
            </form>
          ) : <ProfileActionLink href="/login" icon="add">Add to friends</ProfileActionLink>}
        </ActionCell>
        <ActionCell>
          {props.user && !props.ownProfile ? (
            <form action="/favorites/add" method="post">
              <CsrfInput csrf={props.csrf} />
              <input type="hidden" name="id" value={props.profile.id} />
              <ProfileActionButton icon="favorite" variant="secondary">Add to favorites</ProfileActionButton>
            </form>
          ) : <ProfileActionLabel disabled icon="favorite">Add to favorites</ProfileActionLabel>}
        </ActionCell>
        <MessageActions profile={props.profile} ownProfile={props.ownProfile} />
        <ActionCell>
          {props.ownProfile ? <ProfileActionLabel disabled icon="message">Instant message</ProfileActionLabel> : (
            <ProfileActionLink href={newMessagePath({ to: props.profile.handle, mode: "instant" })} icon="message">Instant message</ProfileActionLink>
          )}
        </ActionCell>
        <ActionCell>
          {props.ownProfile ? <ProfileActionLabel disabled icon="report">Report user</ProfileActionLabel> : (
            <ProfileActionLink href={reportPath("user", props.profile)} icon="report">Report user</ProfileActionLink>
          )}
        </ActionCell>
        {props.user && !props.ownProfile && !props.protectedAdminProfile ? (
          <ActionCell>
            <form action="/blocks" method="post">
              <CsrfInput csrf={props.csrf} />
              <input type="hidden" name="id" value={props.profile.id} />
              <input type="hidden" name="action" value={props.blockedByMe ? "unblock" : "block"} />
              <ProfileActionButton icon={props.blockedByMe ? "unlock" : "lock"} variant={props.blockedByMe ? "secondary" : "danger"}>
                {props.blockedByMe ? "Unblock user" : "Block user"}
              </ProfileActionButton>
            </form>
          </ActionCell>
        ) : null}
        {canModerateProfile ? <StaffActions {...props} /> : null}
      </div>
    </Panel>
  );
}

function ActionCell(props: { children: ViewChild }) {
  return <div class="profile-actions__cell">{props.children}</div>;
}

function ProfileActionButton(props: {
  children: ViewChild;
  disabled?: boolean;
  icon: IconName;
  variant?: ProfileActionVariant;
}) {
  return (
    <button class={profileActionClass(props.variant, props.disabled)} type="submit" disabled={props.disabled}>
      <ProfileActionContent icon={props.icon}>{props.children}</ProfileActionContent>
    </button>
  );
}

function ProfileActionLink(props: { children: ViewChild; href: string; icon: IconName; variant?: ProfileActionVariant }) {
  return (
    <a class={profileActionClass(props.variant)} href={props.href}>
      <ProfileActionContent icon={props.icon}>{props.children}</ProfileActionContent>
    </a>
  );
}

function ProfileActionLabel(props: { children: ViewChild; disabled?: boolean; icon: IconName; variant?: ProfileActionVariant }) {
  return (
    <span class={profileActionClass(props.variant, props.disabled)} aria-disabled={props.disabled ? "true" : undefined}>
      <ProfileActionContent icon={props.icon}>{props.children}</ProfileActionContent>
    </span>
  );
}

function ProfileActionContent(props: { children: ViewChild; icon: IconName }) {
  return (
    <>
      <Icon name={props.icon} />
      <span>{props.children}</span>
    </>
  );
}

function profileActionClass(variant?: ProfileActionVariant, disabled?: boolean) {
  return classNames("profile-action", variant && `profile-action--${variant}`, disabled && "profile-action--disabled");
}

function MessageActions(props: { profile: UserProfile; ownProfile: boolean }) {
  return (
    <>
      <ActionCell>
        {props.ownProfile ? <ProfileActionLabel disabled icon="comment">Send message</ProfileActionLabel> : (
          <ProfileActionLink href={newMessagePath({ to: props.profile.handle })} icon="comment">Send message</ProfileActionLink>
        )}
      </ActionCell>
      <ActionCell>
        <ProfileActionLink href={newMessagePath({ forward: "profile", id: props.profile.id })} icon="forward">Forward to friend</ProfileActionLink>
      </ActionCell>
    </>
  );
}

function StaffActions(props: ProfileActionProps) {
  return (
    <>
      <ActionCell>
        <ProfileActionLink href={isAdminUser(props.user) ? `/admin/users/${props.profile.id}` : "/moderation/reports"} icon={isAdminUser(props.user) ? "user" : "report"}>
          {isAdminUser(props.user) ? "Admin details" : "Open reports"}
        </ProfileActionLink>
      </ActionCell>
      <ActionCell>
        <form action={`/moderation/users/${props.profile.id}/ban`} method="post">
          <CsrfInput csrf={props.csrf} />
          <input type="hidden" name="action" value={props.profile.bannedAt ? "unban" : "ban"} />
          <ProfileActionButton icon={props.profile.bannedAt ? "unlock" : "lock"} variant={props.profile.bannedAt ? "secondary" : "danger"}>
            {props.profile.bannedAt ? "Unban user" : "Ban user"}
          </ProfileActionButton>
        </form>
      </ActionCell>
    </>
  );
}
