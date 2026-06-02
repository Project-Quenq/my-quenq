import type { CurrentUser } from "../../currentUser.js";
import type { BlogListItem, GroupItem, PersonCard, PostItem, SkinItem } from "../../models.js";
import { limits } from "../../policy.js";
import { searchBlogs } from "./blogs/index.js";
import { searchGroups } from "./groups.js";
import { searchPosts } from "./posts/index.js";
import { searchSkins } from "./skins.js";
import { searchUsers } from "./users.js";

export type SiteSearchResults = {
  people: PersonCard[];
  blogs: BlogListItem[];
  groups: GroupItem[];
  posts: PostItem[];
  skins: SkinItem[];
};

export function searchSite(query: string, viewer: CurrentUser | null): SiteSearchResults {
  const limit = limits.searchResults;
  return {
    people: searchUsers(query, viewer, limit),
    blogs: searchBlogs(query, viewer, limit).blogs,
    groups: viewer ? searchGroups(query, viewer, limit) : [],
    posts: searchPosts(query, viewer, limit),
    skins: searchSkins(query, viewer, limit)
  };
}
