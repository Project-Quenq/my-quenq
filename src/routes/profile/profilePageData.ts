import { blogsForUser } from "../../server/db/blogs/index.js";
import { canPostToWall, postsForProfilePage } from "../../server/db/posts/index.js";
import { friendCountFor, visibleFriendsFor } from "../../server/db/relationships.js";
import type { Friendship, UserProfile } from "../../models.js";
import { env } from "../../server/env.js";
import { paginationHref, previewFromRows } from "../../server/pagination.js";
import { limits } from "../../policy.js";
import type { CurrentUser } from "../../currentUser.js";
import { profileBlogPath, profileFriendsPath, profilePath, profileWallPath } from "../../paths.js";
import type { ProfilePageProps } from "../../views/profile/index.js";

export function profilePageData(props: {
  user: CurrentUser | null;
  csrf: string;
  profile: UserProfile;
  fullWall?: boolean;
  before?: string;
  friendship?: Friendship;
  blockedByMe?: boolean;
}): ProfilePageProps {
  const wallBaseHref = profileWallPath(props.profile);
  const wallPage = props.fullWall ? postsForProfilePage(props.profile.id, props.user, { before: props.before, limit: limits.listPage }) : null;
  const wallPreviewPage = props.fullWall ? null : postsForProfilePage(props.profile.id, props.user, { limit: limits.profileWallPreview });
  const frontRow = previewFromRows(visibleFriendsFor(props.profile.id, props.user, limits.profileFrontRow + 1), limits.profileFrontRow);
  const blogPreview = previewFromRows(blogsForUser(props.profile.id, props.user, limits.profileBlogPreview + 1), limits.profileBlogPreview);

  return {
    user: props.user,
    csrf: props.csrf,
    profile: props.profile,
    profileUrlLabel: profileUrlDisplay(profilePath(props.profile)),
    friendCount: friendCountFor(props.profile.id, props.user),
    frontRow: frontRow.items,
    friendsHref: frontRow.hasMore ? profileFriendsPath(props.profile) : null,
    blogs: blogPreview.items,
    blogHref: blogPreview.hasMore ? profileBlogPath(props.profile) : null,
    wallPosts: wallPage ? wallPage.items : wallPreviewPage?.items ?? [],
    fullWall: props.fullWall,
    wallNextHref: wallPage?.nextCursor ? paginationHref(wallBaseHref, wallPage.nextCursor) : null,
    wallResetHref: wallPage && props.before ? wallBaseHref : null,
    wallViewAllHref: wallPreviewPage?.nextCursor ? wallBaseHref : null,
    canPost: props.user ? canPostToWall(props.user.id, props.profile.id) : false,
    friendship: props.friendship,
    blockedByMe: props.blockedByMe,
    protectedAdminProfile: props.profile.id === env.adminUserId
  };
}

function profileUrlDisplay(path: string) {
  return new URL(path, `${env.baseUrl}/`).href.replace(/^https?:\/\//, "");
}
