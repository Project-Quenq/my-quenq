import { friendshipStatus } from "../../policy.js";
import { SplitLayout } from "../../shell/index.js";
import { ProfileMain } from "./main.js";
import { ProfileSidebar } from "./sidebar.js";
import { profileSkinFromHtml, profileSkinRoot, type ProfileSkin } from "../../skins/rendering.js";
import type { ProfilePageProps } from "./pageProps.js";

export function ProfileLayout(props: ProfilePageProps & { skin?: ProfileSkin }) {
  const ownProfile = props.user?.id === props.profile.id;
  const isFriend = props.friendship?.status === friendshipStatus.accepted;
  const pendingFriendship = props.friendship?.status === friendshipStatus.pending ? props.friendship : undefined;
  const skin = props.skin ?? profileSkinFromHtml(props.profile.skinHtml);

  return (
    <SplitLayout
      variant="profile"
      className="profile"
      dataAttributes={profileSkinRoot()}
      itemscope
      itemtype="https://schema.org/Person"
    >
      <ProfileSidebar
        user={props.user}
        csrf={props.csrf}
        profile={props.profile}
        profileUrlLabel={props.profileUrlLabel}
        isFriend={isFriend}
        pendingSent={Boolean(props.user && pendingFriendship?.sender_id === props.user.id)}
        pendingReceived={Boolean(props.user && pendingFriendship?.receiver_id === props.user.id)}
        ownProfile={ownProfile}
        blockedByMe={Boolean(props.blockedByMe)}
        protectedAdminProfile={Boolean(props.protectedAdminProfile)}
      />
      <ProfileMain {...props} isFriend={isFriend} ownProfile={ownProfile} skin={skin} />
    </SplitLayout>
  );
}
