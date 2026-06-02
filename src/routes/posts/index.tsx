import type { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { anchors } from "../../anchors.js";
import { requireAuth, visibleGroup, visibleProfile } from "../../server/access.js";
import { csrfToken } from "../../server/auth/session.js";
import { scanAutomodSubmission } from "../../server/db/automod.js";
import { profileByHandle } from "../../server/db/users.js";
import {
  addPostComment,
  addPostProp,
  canInteractWithPost,
  canPostToGroup,
  canPostToWall,
  createGroupPost,
  createWallPost,
  deletePost,
  deletePostComment,
  feedPageForUser,
  getPost,
  getVisiblePost,
  postCommentsFor,
  removePostProp
} from "../../server/db/posts/index.js";
import { audit, moderationSubjectAuditMetadata } from "../../server/db/moderation/index.js";
import { notifyPostComment, notifyPostProp } from "../../server/db/notifications/index.js";
import { addCommentFromForm, deleteCommentFromRoute } from "../../server/comments/actions.js";
import { fileField } from "../../server/forms.js";
import { localBack, requiredUserText, routeId, verifiedActionForm, withFragment } from "../../server/http.js";
import { deletePostImage, savePostImage } from "../../server/media/upload.js";
import { canDeleteAsOwnerOrModerator, canModerateAuthor } from "../../server/moderation/guards.js";
import { beforeParam, paginationHref } from "../../server/pagination.js";
import { limits } from "../../policy.js";
import type { CurrentUser } from "../../currentUser.js";
import type { AppBindings, AppContext } from "../../server/context.js";
import type { UserProfile } from "../../models.js";
import { FeedPage, PostPage } from "../../views/posts/index.js";
import { groupPath, postPath, profilePath } from "../../paths.js";

export function registerPostRoutes(app: Hono<AppBindings>) {
  app.get("/feed", (c) => {
    const user = requireAuth(c);
    const before = c.req.query(beforeParam);
    const page = feedPageForUser(user, { before, limit: limits.feedPosts });
    return c.html(
      <FeedPage
        user={user}
        csrf={csrfToken(c)}
        posts={page.items}
        nextHref={page.nextCursor ? paginationHref("/feed", page.nextCursor) : null}
        resetHref={before ? "/feed" : null}
      />
    );
  });

  app.post("/feed", (c) => createWallPostAction(c, (user) => user.id, (_profile, postId) => withFragment("/feed", anchors.post(postId))));
  app.post("/u/:handle/wall", (c) =>
    createWallPostAction(c, () => routeProfileHandle(c), (profile, postId) => withFragment(profilePath(profile), anchors.post(postId)))
  );

  app.post("/g/:id/posts", async (c) => {
    const user = requireAuth(c);
    const form = await verifiedActionForm(c, "post.create");
    const { group } = visibleGroup(c, routeId(c));
    if (!canPostToGroup(user.id, group.id)) throw new HTTPException(403, { message: "Only group members can post here." });
    const post = await createPostFromForm(form, (bodyHtml, media) => createGroupPost(user.id, group.id, bodyHtml, media));
    post.automod.createReports({ subjectType: "post", subjectId: post.id, authorId: user.id });
    return c.redirect(withFragment(groupPath(group), anchors.post(post.id)));
  });

  app.post("/p/comments/:id/delete", (c) =>
    deleteCommentFromRoute(c, { subjectType: "post_comment", delete: deletePostComment, fallback: "/feed", redirectFragment: anchors.comments })
  );

  app.post("/p/:id/prop", async (c) => propAction(c, addPostProp, notifyPostProp));
  app.post("/p/:id/unprop", async (c) => propAction(c, removePostProp));

  app.post("/p/:id/comments", async (c) => {
    const user = requireAuth(c);
    const form = await verifiedActionForm(c, "comment.create");
    const post = visiblePost(c, user);
    if (!canInteractWithPost(post, user.id)) throw new HTTPException(403, { message: "You cannot comment on this post." });
    return addCommentFromForm(c, user, {
      form,
      subjectType: "post_comment",
      redirect: (commentId) => localBack(c, postPath(post), { fragment: anchors.comment(commentId) }),
      add: (textHtml, parentId) => addPostComment(post.id, user.id, textHtml, parentId, user),
      afterAdd: notifyPostComment
    });
  });

  app.post("/p/:id/delete", async (c) => {
    const user = requireAuth(c);
    await verifiedActionForm(c, "content.write");
    const post = getPost(routeId(c), user);
    if (!post) throw new HTTPException(404, { message: "Post not found." });
    const ownerIds = [post.authorId, post.wallUserId, post.groupOwnerId];
    if (!canDeleteAsOwnerOrModerator(user, post.authorId, ownerIds)) throw new HTTPException(403, { message: "You cannot delete this post." });
    const elevated = canModerateAuthor(user, post.authorId) && !ownerIds.includes(user.id);
    const auditMetadata = elevated ? moderationSubjectAuditMetadata("post", post.id) : {};
    const deletedMedia = deletePost(post.id, user.id, elevated);
    if (deletedMedia === false) throw new HTTPException(403, { message: "You cannot delete this post." });
    await deletePostImage(deletedMedia);
    if (elevated) audit(user.id, "delete", "post", post.id, "", auditMetadata);
    return c.redirect(localBack(c, "/feed", { avoid: [postPath(post)] }));
  });

  app.get("/p/:id", (c) => {
    const user = requireAuth(c);
    const post = visiblePost(c, user);
    return c.html(
      <PostPage
        user={user}
        csrf={csrfToken(c)}
        post={post}
        comments={postCommentsFor(post.id, user)}
        canInteract={canInteractWithPost(post, user.id)}
      />
    );
  });
}

async function createWallPostAction(
  c: AppContext,
  profileIdFor: (user: CurrentUser) => number,
  redirectFor: (profile: UserProfile, postId: number) => string
) {
  const user = requireAuth(c);
  const form = await verifiedActionForm(c, "post.create");
  const { profile } = visibleProfile(c, profileIdFor(user));
  if (!canPostToWall(user.id, profile.id)) throw new HTTPException(403, { message: "You cannot post on this wall." });
  const post = await createPostFromForm(form, (bodyHtml, media) => createWallPost(user.id, profile.id, bodyHtml, media));
  post.automod.createReports({ subjectType: "post", subjectId: post.id, authorId: user.id });
  return c.redirect(redirectFor(profile, post.id));
}

async function propAction(
  c: AppContext,
  action: (postId: number, userId: number) => boolean | void,
  afterChange?: (postId: number, userId: number) => void
) {
  const user = requireAuth(c);
  await verifiedActionForm(c, "engagement.write");
  const post = visiblePost(c, user);
  if (!canInteractWithPost(post, user.id)) throw new HTTPException(403, { message: "You cannot prop this post." });
  if (action(post.id, user.id)) afterChange?.(post.id, user.id);
  return c.redirect(localBack(c, postPath(post), { fragment: anchors.post(post) }));
}

function visiblePost(c: AppContext, user: CurrentUser) {
  const post = getVisiblePost(routeId(c), user);
  if (!post) throw new HTTPException(404, { message: "Post not found." });
  return post;
}

function routeProfileHandle(c: AppContext) {
  const profile = profileByHandle(c.req.param("handle") ?? "");
  if (!profile) throw new HTTPException(404, { message: "User not found." });
  return profile.id;
}

async function saveOptionalPostImage(form: Record<string, unknown>) {
  const file = fileField(form, "media");
  return file ? await savePostImage(file) : undefined;
}

async function createPostFromForm(form: Record<string, unknown>, create: (bodyHtml: string, media?: string) => number) {
  const media = await saveOptionalPostImage(form);
  try {
    const bodyHtml = requiredUserText(form, "text", limits.postText, "Post text is required.");
    const automod = scanAutomodSubmission("post", bodyHtml);
    return { id: create(bodyHtml, media), automod };
  } catch (error) {
    await deletePostImage(media);
    throw error;
  }
}
