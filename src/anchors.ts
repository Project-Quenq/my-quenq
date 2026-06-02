type IdTarget = number | { id: number };

function idValue(target: IdTarget) {
  return typeof target === "number" ? target : target.id;
}

function idAnchor(prefix: string, target: IdTarget) {
  return `${prefix}-${idValue(target)}`;
}

export const anchors = {
  blog: (target: IdTarget) => idAnchor("blog", target),
  comment: (target: IdTarget) => idAnchor("comment", target),
  comments: "comments",
  groupPosts: "group-posts",
  post: (target: IdTarget) => idAnchor("post", target),
  profileActions: "profile-actions",
  wall: "wall"
} as const;
