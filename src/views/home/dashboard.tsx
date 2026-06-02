import type { BlogListItem, GroupItem, PersonCard, PostItem, UserProfile } from "../../models.js";
import { anchors } from "../../anchors.js";
import type { SiteSettings } from "../../settings/site.js";
import type { CurrentUser } from "../../currentUser.js";
import { Icon } from "../../ui/icons.js";
import { Panel } from "../../ui/panels.js";
import { ProfileImage } from "../../ui/avatars.js";
import { CommunityBox } from "../../ui/groups.js";
import { PeopleBox } from "../../ui/people.js";
import { blogPath, profileBlogPath, profileFriendsPath, profilePath } from "../../paths.js";
import { AuthorSkinStyles } from "../../skins/rendering.js";
import { PreviewTitleLink } from "../../ui/previews.js";
import { InlineLinks } from "../../ui/links.js";
import { Layout, SplitLayout, SplitPane } from "../../shell/index.js";
import { PostList } from "../posts/index.js";
import { AnnouncementBox, SourceBox } from "./infoPanels.js";

export function HomePage(props: {
  user: CurrentUser;
  csrf: string;
  settings: SiteSettings;
  profile: UserProfile;
  newest: PersonCard[];
  newestGroups: GroupItem[];
  friendCount: number;
  pending: PersonCard[];
  blogs: BlogListItem[];
  feedPosts: PostItem[];
  feedHref?: string | null;
  newestHref?: string | null;
  newestGroupsHref?: string | null;
}) {
  const publicProfilePath = profilePath(props.profile);
  return (
    <Layout title="Home" user={props.user} head={<AuthorSkinStyles items={props.feedPosts} />}>
      <SplitLayout variant="dashboard">
        <SplitPane area="sidebar">
          <Panel className="home-actions" title={<>Hello, {props.profile.username}!</>} headingLevel="h1">
            <div class="profile-pic">
              <ProfileImage
                alt={`${props.profile.username}'s profile picture`}
                filename={props.profile.pfp}
                variant="profile"
              />
            </div>
            <div class="details">
              <p><a href="/account/profile"><Icon name="edit" /> Edit profile</a></p>
              <p><a href="/account/status"><Icon name="message" /> Edit status</a></p>
              <p><a href="/settings"><Icon name="settings" /> Account settings</a></p>
            </div>
            <div class="more-options">
              <p class="profile-links">
                <span class="profile-links__heading"><b>View my:</b></span>
                <InlineLinks
                  links={[
                    ["Profile", publicProfilePath],
                    ["Posts", `${publicProfilePath}#${anchors.wall}`],
                    ["Blog", profileBlogPath(props.profile)],
                    ["Friends", profileFriendsPath(props.profile)],
                    ["Requests", "/requests"]
                  ]}
                />
              </p>
              <p class="profile-url">
                <span><Icon name="link" /> <span>My URL: <a href={publicProfilePath}>{publicProfilePath}</a></span></span>
              </p>
            </div>
          </Panel>
          <Panel className="home-stats" title={`${props.profile.username}'s stats`} tone="soft">
            <p>Your friends: <a href={profileFriendsPath(props.profile)}><span class="count">{props.friendCount}</span></a></p>
            <p>Profile views: <span class="count">{props.profile.views}</span></p>
          </Panel>
          {/* <SourceBox /> */}
          <AnnouncementBox settings={props.settings} />
        </SplitPane>
        <SplitPane area="main">
          <Panel className="post-panel" title="Feed" headerAction={props.feedHref ? <a href={props.feedHref}>[view all]</a> : null} tone="soft">
            <PostList user={props.user} csrf={props.csrf} posts={props.feedPosts} empty="No posts yet." />
          </Panel>
          <Panel title="Your latest blog entries" headerAction={<a href="/blog/new">[New entry]</a>} tone="soft">
            {props.blogs.length ? props.blogs.map((entry) => (
              <p><PreviewTitleLink href={blogPath(entry)} title={entry.title} titleLength={24} /></p>
            )) : <p><i>There are no blog entries yet.</i></p>}
          </Panel>
          <PeopleBox title="Cool new people" people={props.newest} singleLine />
          <CommunityBox title="Cool new communities" groups={props.newestGroups} more={props.newestGroupsHref ?? undefined} singleLine />
          <PeopleBox title={`Friend requests (${props.pending.length})`} people={props.pending} more="/requests" />
        </SplitPane>
      </SplitLayout>
    </Layout>
  );
}
