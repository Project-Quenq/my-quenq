import type { BlogListItem, Friendship, PersonCard, PostItem, UserProfile } from "../../models.js";
import type { CurrentUser } from "../../currentUser.js";

export type ProfilePageProps = {
  user: CurrentUser | null;
  csrf: string;
  profile: UserProfile;
  profileUrlLabel: string;
  friendCount: number;
  frontRow: PersonCard[];
  blogs: BlogListItem[];
  blogHref?: string | null;
  friendsHref?: string | null;
  wallPosts: PostItem[];
  fullWall?: boolean;
  wallNextHref?: string | null;
  wallResetHref?: string | null;
  wallViewAllHref?: string | null;
  canPost: boolean;
  friendship?: Friendship;
  blockedByMe?: boolean;
  protectedAdminProfile?: boolean;
};
