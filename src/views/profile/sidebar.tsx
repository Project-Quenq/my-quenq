import type { UserProfile } from "../../models.js";
import { defaultMedia } from "../../policy.js";
import type { CurrentUser } from "../../currentUser.js";
import { SplitPane } from "../../shell/index.js";
import { ProfileImage } from "../../ui/avatars.js";
import { profilePath, themeSongPath } from "../../paths.js";
import { ProfileActionsPanel } from "./actions.js";
import { ProfileInterests, ProfileSocialLinks } from "./details.js";
import { profileSkinPart } from "../../skins/rendering.js";

type ProfileSidebarProps = {
  user: CurrentUser | null;
  csrf: string;
  profile: UserProfile;
  profileUrlLabel: string;
  isFriend: boolean;
  pendingSent: boolean;
  pendingReceived: boolean;
  ownProfile: boolean;
  blockedByMe: boolean;
  protectedAdminProfile: boolean;
};

export function ProfileSidebar(props: ProfileSidebarProps) {
  const hasThemeSong = props.profile.themeSong !== defaultMedia.themeSong;
  const themeSongType = props.profile.themeSong.endsWith(".ogg") ? "audio/ogg" : "audio/mpeg";
  const profileUrlPath = profilePath(props.profile);
  const status = props.profile.status.status.trim();
  const currentVibe = props.profile.status.currentVibe.trim();

  return (
    <SplitPane area="sidebar" className="profile__sidebar" dataAttributes={profileSkinPart("sidebar")}>
      <div class="profile__identity" {...profileSkinPart("identity")}>
        <h1 class="profile__name flush-heading" {...profileSkinPart("name")}>{props.profile.username}</h1>
        <div class="profile__about general-about" {...profileSkinPart("about")}>
          <div class="profile__photo profile-pic" {...profileSkinPart("photo")}>
            <ProfileImage alt={`${props.profile.username}'s profile picture`} filename={props.profile.pfp} variant="profile" />
          </div>
          {status ? (
            <div class="profile__details details" {...profileSkinPart("details")}>
              <p>"{status}"</p>
            </div>
          ) : null}
        </div>
      </div>
      {hasThemeSong ? (
        <audio controls autoplay id="theme-song" {...profileSkinPart("theme-song")}>
          <source src={themeSongPath(props.profile.themeSong)} type={themeSongType} />
        </audio>
      ) : null}
      {currentVibe ? (
        <div class="profile__vibe current-vibe" {...profileSkinPart("vibe")}>
          <p><b>Current vibe: </b>{currentVibe}</p>
        </div>
      ) : null}
      <ProfileActionsPanel
        user={props.user}
        csrf={props.csrf}
        profile={props.profile}
        isFriend={props.isFriend}
        pendingSent={props.pendingSent}
        pendingReceived={props.pendingReceived}
        ownProfile={props.ownProfile}
        blockedByMe={props.blockedByMe}
        protectedAdminProfile={props.protectedAdminProfile}
      />
      <div class="profile__url url-info" {...profileSkinPart("url")}>
        <p><b>Profile URL:</b> <a href={profileUrlPath}>{props.profileUrlLabel}</a></p>
      </div>
      <ProfileSocialLinks profile={props.profile} />
      <ProfileInterests profile={props.profile} />
    </SplitPane>
  );
}
