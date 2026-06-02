import { UserContent } from "../../ui/userContent.js";
import { PeopleBox } from "../../ui/people.js";
import { PreviewTitleLink } from "../../ui/previews.js";
import { Panel } from "../../ui/panels.js";
import { SplitPane } from "../../shell/index.js";
import { WallBox } from "../posts/index.js";
import { ProfileCustomSkin, profileSkinPart, type ProfileSkin } from "../../skins/rendering.js";
import { blogPath } from "../../paths.js";
import type { ProfilePageProps } from "./pageProps.js";

export function ProfileMain(props: ProfilePageProps & { isFriend: boolean; ownProfile: boolean; skin: ProfileSkin }) {
  const hasBio = Boolean(props.profile.bioHtml.trim());
  const customSkin = props.skin.bodyHtml ? <ProfileCustomSkin skin={props.skin} /> : null;

  return (
    <SplitPane area="main" className="profile__main" dataAttributes={profileSkinPart("main")}>
      {props.isFriend ? <div class="profile__notice profile-info" {...profileSkinPart("notice")}><h3>{props.profile.username} is your friend.</h3></div> : null}
      {props.ownProfile ? <div class="profile__notice profile-info" {...profileSkinPart("notice")}><h3><a href="/account/profile">Edit your profile</a></h3></div> : null}
      {hasBio ? (
        <Panel className="profile__bio profile-card profile-bio-panel" dataAttributes={profileSkinPart("bio")} title={`${props.profile.username}'s bio`}>
          <UserContent className="profile__bio-content profile-section" html={props.profile.bioHtml} dataAttributes={profileSkinPart("bio-content")} />
        </Panel>
      ) : null}
      {customSkin}
      <ProfileBlogPreview {...props} />
      <WallBox
        user={props.user}
        csrf={props.csrf}
        profile={props.profile}
        posts={props.wallPosts}
        canPost={props.canPost}
        fullWall={props.fullWall}
        nextHref={props.wallNextHref}
        resetHref={props.wallResetHref}
        viewAllHref={props.wallViewAllHref}
      />
      <PeopleBox
        className="profile__friends profile-card profile-front-row"
        dataAttributes={profileSkinPart("friends")}
        title={`${props.profile.username}'s front row`}
        people={props.frontRow}
        more={props.friendsHref ?? undefined}
        prefix={<p><b>{props.profile.username} has <span class="count">{props.friendCount}</span> friends.</b></p>}
      />
    </SplitPane>
  );
}

function ProfileBlogPreview(props: ProfilePageProps) {
  return (
    <Panel
      className="profile__blog-preview profile-card"
      dataAttributes={profileSkinPart("blog-preview")}
      headerAction={props.blogHref ? <a href={props.blogHref}>[View blog]</a> : null}
      title={`${props.profile.username}'s latest blog entries`}
    >
      {props.blogs.length ? props.blogs.map((entry) => (
        <p><PreviewTitleLink href={blogPath(entry)} title={entry.title} titleLength={28} /></p>
      )) : <p><i>There are no blog entries yet.</i></p>}
    </Panel>
  );
}
