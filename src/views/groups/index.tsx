import type { GroupItem, GroupMember, PostItem } from "../../models.js";
import { limits, systemIds } from "../../policy.js";
import { canModerateTarget, isAdminUser } from "../../roles.js";
import type { CurrentUser } from "../../currentUser.js";
import { userTextFromHtml } from "../../server/security/html.js";
import { ActionBar, ActionLabel } from "../../ui/actions.js";
import { GroupSummaryCard } from "../../ui/groups.js";
import { BackLink, BackToPage } from "../../ui/links.js";
import { GroupPostBox } from "../posts/index.js";
import { AuthorSkinStyles } from "../../skins/rendering.js";
import { UserContent } from "../../ui/userContent.js";
import { CharacterLimitHint, CsrfInput, FormActions, FormError, FormField, FormStack } from "../../ui/forms.js";
import { MetaSubjectLink } from "../../ui/meta.js";
import { PeopleBox } from "../../ui/people.js";
import { groupPath, profilePath } from "../../paths.js";
import { Layout, PageFrame } from "../../shell/index.js";

export function GroupListPage(props: { user: CurrentUser; groups: GroupItem[] }) {
  return (
    <Layout title="Groups" user={props.user}>
      <PageFrame title="Groups">
        <h3>[<a href="/groups/new">Create a new group</a>]</h3>
        {props.groups.length ? props.groups.map((group) => <GroupSummaryCard group={group} />) : <p>No groups have been created... (yet)</p>}
      </PageFrame>
    </Layout>
  );
}

export function GroupFormPage(props: { user: CurrentUser; csrf: string; group?: GroupItem; message?: string }) {
  const group = props.group;
  const action = group ? `${groupPath(group)}/edit` : "/groups/new";
  return (
    <Layout title={group ? "Edit group" : "Create group"} user={props.user}>
      <PageFrame
        back={group ? <BackLink href={groupPath(group)} label={group.name} /> : <BackToPage page="groups" />}
        title={group ? "Edit group" : "Create group"}
      >
        <FormError>{props.message}</FormError>
        <FormStack action={action}>
          <CsrfInput csrf={props.csrf} />
          <FormField label="Name">
            <input required placeholder="Name" type="text" name="groupname" maxLength={limits.shortText} value={group?.name ?? ""} />
          </FormField>
          <FormField label="Description">
            <textarea required rows={10} placeholder="Description" name="desc" maxLength={limits.groupText}>{group ? userTextFromHtml(group.descriptionHtml) : ""}</textarea>
          </FormField>
          <FormActions hint={<CharacterLimitHint maxLength={limits.groupText} />}>
            <button type="submit"><ActionLabel action={group ? "save" : "post"}>{group ? "Save" : "Create"}</ActionLabel></button>
          </FormActions>
        </FormStack>
      </PageFrame>
    </Layout>
  );
}

type GroupPageProps = {
  user: CurrentUser;
  csrf: string;
  group: GroupItem;
  posts: PostItem[];
  members: GroupMember[];
  isMember: boolean;
  fullPosts?: boolean;
  postsNextHref?: string | null;
  postsResetHref?: string | null;
  postsViewAllHref?: string | null;
};

export function GroupPage(props: GroupPageProps) {
  const groupHref = groupPath(props.group);
  const protectedGroup = props.group.id === systemIds.defaultGroupId;
  const isOwner = props.user.id === props.group.ownerId;
  const canManage = isOwner || isAdminUser(props.user);
  const canDelete = !protectedGroup && (canManage || canModerateTarget(props.user, { id: props.group.ownerId, role: props.group.ownerRole }));
  const membershipAction = !protectedGroup && !isOwner ? (
    <form method="post" action={`${groupHref}/${props.isMember ? "leave" : "join"}`} class="inline-form">
      <CsrfInput csrf={props.csrf} />
      <button class={props.isMember ? "button--secondary" : undefined} type="submit">
        <ActionLabel action={props.isMember ? "leave" : "add"}>{props.isMember ? "Leave group" : "Join group"}</ActionLabel>
      </button>
    </form>
  ) : null;
  const managementActions = canDelete ? (
    <>
      {canManage ? <a href={`${groupHref}/edit`}><ActionLabel action="edit">Edit</ActionLabel></a> : null}
      <form method="post" action={`${groupHref}/delete`} class="inline-form">
        <CsrfInput csrf={props.csrf} />
        <button class="button--danger" type="submit"><ActionLabel action="delete">Delete</ActionLabel></button>
      </form>
    </>
  ) : null;
  const groupActions = membershipAction || managementActions ? (
    <ActionBar className="group-actions" primary={<>{membershipAction}{managementActions}</>} />
  ) : null;
  return (
    <Layout title={props.group.name} user={props.user} head={<AuthorSkinStyles items={props.posts} />}>
      <PageFrame
        back={props.fullPosts ? <BackLink href={groupHref} label={props.group.name} /> : <BackToPage page="groups" />}
        title={props.group.name}
      >
        <p class="group-owner card-attribution">Owner: <MetaSubjectLink href={profilePath(props.group.ownerHandle)}>{props.group.ownerName}</MetaSubjectLink></p>
        {groupActions}
        <UserContent className="text-block group-description" html={props.group.descriptionHtml} />
        <GroupPostBox
          user={props.user}
          csrf={props.csrf}
          group={props.group}
          posts={props.posts}
          isMember={props.isMember}
          fullPosts={props.fullPosts}
          nextHref={props.postsNextHref}
          resetHref={props.postsResetHref}
          viewAllHref={props.postsViewAllHref}
        />
        <PeopleBox
          title="Members"
          people={props.members}
          prefix={<p><b>{props.members.length} {props.members.length === 1 ? "member" : "members"}.</b></p>}
        />
      </PageFrame>
    </Layout>
  );
}
