import type { GroupItem, PostItem, UserProfile } from "../../models.js";
import { anchors } from "../../anchors.js";
import type { CurrentUser } from "../../currentUser.js";
import { PaginationNav } from "../../ui/pagination.js";
import { Panel } from "../../ui/panels.js";
import { PostComposer } from "./composer.js";
import { PostList } from "./cards.js";
import { profileSkinPart } from "../../skins/rendering.js";
import { groupPath, profileWallPath } from "../../paths.js";

export function WallBox(props: {
  user: CurrentUser | null;
  csrf: string;
  profile: UserProfile;
  posts: PostItem[];
  canPost: boolean;
  fullWall?: boolean;
  nextHref?: string | null;
  resetHref?: string | null;
  viewAllHref?: string | null;
}) {
  return (
    <Panel className="profile__wall profile-card post-panel" dataAttributes={profileSkinPart("wall")} id={anchors.wall} title={`${props.profile.username}'s posts`}>
      {props.canPost ? (
        <PostComposer action={profileWallPath(props.profile)} csrf={props.csrf} button="Post to wall" />
      ) : props.user ? <p><i>Only {props.profile.username}'s friends can post here.</i></p> : <p><a href="/login">Log in</a> to post.</p>}
      {!props.fullWall && props.viewAllHref ? <p>( <a href={props.viewAllHref}>View all</a> )</p> : null}
      <PostList
        skinSource="surrounding-profile"
        user={props.user}
        csrf={props.csrf}
        posts={props.posts}
        empty="No posts yet."
      />
      <PaginationNav nextHref={props.nextHref} nextLabel="Older posts" resetHref={props.resetHref} resetLabel="Newest posts" />
    </Panel>
  );
}

export function GroupPostBox(props: {
  user: CurrentUser;
  csrf: string;
  group: GroupItem;
  posts: PostItem[];
  isMember: boolean;
  fullPosts?: boolean;
  nextHref?: string | null;
  resetHref?: string | null;
  viewAllHref?: string | null;
}) {
  return (
    <Panel className="post-panel post-panel--author-skin-bleed" id={anchors.groupPosts} title="Posts" tone="soft">
      {props.isMember ? (
        <PostComposer action={`${groupPath(props.group)}/posts`} csrf={props.csrf} button="Post" />
      ) : <p><i>Only group members can post, prop, or comment.</i></p>}
      {!props.fullPosts && props.viewAllHref ? <p>( <a href={props.viewAllHref}>View all</a> )</p> : null}
      <PostList user={props.user} csrf={props.csrf} posts={props.posts} empty="No group posts yet." canInteract={props.isMember} />
      <PaginationNav nextHref={props.nextHref} nextLabel="Older posts" resetHref={props.resetHref} resetLabel="Newest posts" />
    </Panel>
  );
}
