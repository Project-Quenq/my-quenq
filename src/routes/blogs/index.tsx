import type { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { anchors } from "../../anchors.js";
import { csrfToken, currentUser } from "../../server/auth/session.js";
import { requireAuth, requireBlog, requireOwnerOrAdmin, requireProfile, visibleProfile } from "../../server/access.js";
import { scanAutomodSubmission } from "../../server/db/automod.js";
import {
  addBlogComment,
  addBlogProp,
  allBlogs,
  blogsByCategory,
  blogCommentsFor,
  canViewBlog,
  createBlog,
  deleteBlog,
  deleteBlogComment,
  removeBlogProp,
  updateBlog
} from "../../server/db/blogs/index.js";
import { audit, moderationSubjectAuditMetadata } from "../../server/db/moderation/index.js";
import { notifyBlogComment, notifyBlogProp } from "../../server/db/notifications/index.js";
import { addCommentFromForm, deleteCommentFromRoute } from "../../server/comments/actions.js";
import { field } from "../../server/forms.js";
import { badFormRequestMessage, localBack, requiredBlogBody, requiredField, routeId, verifiedActionForm } from "../../server/http.js";
import { canDeleteAsOwnerOrModerator, canModerateAuthor } from "../../server/moderation/guards.js";
import { previewFromRows } from "../../server/pagination.js";
import { defaultBlogCategory, isBlogCategory, limits } from "../../policy.js";
import type { AppBindings, AppContext } from "../../server/context.js";
import { BlogEntryPage, BlogListPage, EditBlogPage, NewBlogPage } from "../../views/blogs/index.js";
import { blogCommentsPath, blogPath, profileBlogPath } from "../../paths.js";

export function registerBlogRoutes(app: Hono<AppBindings>) {
  app.get("/blog", (c) => {
    const user = currentUser(c);
    return c.html(
      <BlogListPage
        user={user}
        title="Blog"
        blogs={allBlogs(user)}
        seo={{ canonicalPath: "/blog", description: "Read public blog entries from the community." }}
      />
    );
  });
  app.get("/blog/new", (c) => c.html(<NewBlogPage user={requireAuth(c)} csrf={csrfToken(c)} />));
  app.post("/blog/new", async (c) => {
    const user = requireAuth(c);
    const form = await verifiedActionForm(c, "blog.create");
    try {
      const fields = blogFields(form);
      const blogId = createBlog(user.id, fields.title, fields.bodyHtml, fields.category, fields.privacyLevel, fields.commentsEnabled);
      fields.automod.createReports({ subjectType: "blog", subjectId: blogId, authorId: user.id });
      return c.redirect(profileBlogPath(requireProfile(user.id)));
    } catch (error) {
      const message = badFormRequestMessage(error);
      if (message) return c.html(<NewBlogPage user={user} csrf={csrfToken(c)} message={message} />, 400);
      throw error;
    }
  });
  app.get("/blog/category/:category", (c) => {
    const user = currentUser(c);
    const category = decodeCategory(c.req.param("category"));
    return c.html(
      <BlogListPage
        user={user}
        title={`Blog category: ${category}`}
        blogs={blogsByCategory(category, user)}
        seo={{
          canonicalPath: `/blog/category/${encodeURIComponent(category)}`,
          description: `Read public ${category} blog entries from the community.`
        }}
      />
    );
  });
  app.get("/b/:id/edit", (c) => {
    const user = requireAuth(c);
    const blog = requireBlog(routeId(c));
    requireOwnerOrAdmin(user, blog.authorId, "You cannot edit this blog entry.");
    return c.html(<EditBlogPage user={user} csrf={csrfToken(c)} blog={blog} />);
  });
  app.post("/b/:id/edit", async (c) => {
    const user = requireAuth(c);
    const form = await verifiedActionForm(c, "content.write");
    const blog = requireBlog(routeId(c));
    requireOwnerOrAdmin(user, blog.authorId, "You cannot edit this blog entry.");
    try {
      const fields = blogFields(form);
      updateBlog(blog.authorId, blog.id, fields.title, fields.bodyHtml, fields.category, fields.privacyLevel, fields.commentsEnabled, field(form, "pinned") === "1");
      fields.automod.createReports({ subjectType: "blog", subjectId: blog.id, authorId: blog.authorId });
      return c.redirect(blogPath(blog));
    } catch (error) {
      const message = badFormRequestMessage(error);
      if (message) return c.html(<EditBlogPage user={user} csrf={csrfToken(c)} blog={blog} message={message} />, 400);
      throw error;
    }
  });
  app.post("/b/:id/prop", async (c) => blogPropAction(c, addBlogProp, notifyBlogProp));
  app.post("/b/:id/unprop", async (c) => blogPropAction(c, removeBlogProp));
  app.post("/b/:id/delete", async (c) => {
    const user = requireAuth(c);
    await verifiedActionForm(c, "content.write");
    const blog = requireBlog(routeId(c));
    if (!canDeleteAsOwnerOrModerator(user, blog.authorId, [blog.authorId])) throw new HTTPException(403, { message: "You cannot delete this blog entry." });
    const elevated = canModerateAuthor(user, blog.authorId) && user.id !== blog.authorId;
    const auditMetadata = elevated ? moderationSubjectAuditMetadata("blog", blog.id) : {};
    deleteBlog(blog.id, user.id, elevated);
    if (elevated) audit(user.id, "delete", "blog", blog.id, "", auditMetadata);
    return c.redirect(profileBlogPath(requireProfile(blog.authorId)));
  });
  app.post("/b/:id/comments", async (c) => {
    const user = requireAuth(c);
    const form = await verifiedActionForm(c, "comment.create");
    const { blog } = viewableBlog(c);
    if (!blog.commentsEnabled) throw new HTTPException(403, { message: "Comments are disabled for this entry." });
    const reply = Boolean(field(form, "parentId"));
    return addCommentFromForm(c, user, {
      form,
      subjectType: "blog_comment",
      redirect: (commentId) =>
        localBack(c, reply ? blogCommentsPath(blog) : blogPath(blog), {
          avoid: reply ? [blogPath(blog)] : undefined,
          fragment: anchors.comment(commentId)
        }),
      add: (textHtml, parentId) => addBlogComment(blog.id, user.id, textHtml, parentId, user),
      afterAdd: notifyBlogComment
    });
  });
  app.post("/b/comments/:id/delete", (c) =>
    deleteCommentFromRoute(c, { subjectType: "blog_comment", delete: deleteBlogComment, fallback: "/blog", redirectFragment: anchors.comments })
  );
  app.get("/b/:id/comments", (c) => blogPage(c, true));
  app.get("/b/:id", (c) => blogPage(c));
}

function blogPage(c: AppContext, fullComments = false) {
  const { user, blog } = viewableBlog(c);
  const commentsHref = blogCommentsPath(blog);
  const commentRows = blogCommentsFor(blog.id, user, fullComments ? undefined : limits.commentsPage + 1);
  const comments = fullComments ? { items: commentRows, hasMore: false } : previewFromRows(commentRows, limits.commentsPage);
  return c.html(
    <BlogEntryPage
      user={user}
      csrf={csrfToken(c)}
      blog={blog}
      comments={comments.items}
      commentsHref={comments.hasMore ? commentsHref : null}
      fullComments={fullComments}
    />
  );
}

function viewableBlog(c: AppContext) {
  const viewer = currentUser(c);
  const blog = requireBlog(routeId(c), viewer);
  const { user } = visibleProfile(c, blog.authorId);
  if (!canViewBlog(user, blog)) throw new HTTPException(403, { message: "You cannot view this blog entry." });
  return { user, blog };
}

async function blogPropAction(
  c: AppContext,
  action: (blogId: number, userId: number) => boolean | void,
  afterChange?: (blogId: number, userId: number) => void
) {
  const user = requireAuth(c);
  await verifiedActionForm(c, "engagement.write");
  const blog = requireBlog(routeId(c), user);
  visibleProfile(c, blog.authorId);
  if (!canViewBlog(user, blog)) throw new HTTPException(403, { message: "You cannot prop this blog entry." });
  if (action(blog.id, user.id)) afterChange?.(blog.id, user.id);
  return c.redirect(localBack(c, blogPath(blog), { fragment: anchors.blog(blog) }));
}

function blogFields(form: Record<string, unknown>) {
  const fields = {
    title: requiredField(form, "title", limits.shortText, "Title is required."),
    bodyHtml: requiredBlogBody(form, "body", limits.contentBody, "Body is required."),
    category: blogCategory(form),
    privacyLevel: privacyLevel(form),
    commentsEnabled: field(form, "commentsEnabled") === "1"
  };
  return { ...fields, automod: scanAutomodSubmission("blog", fields.title, fields.bodyHtml) };
}

function blogCategory(form: Record<string, unknown>) {
  const category = field(form, "category") || defaultBlogCategory;
  if (isBlogCategory(category)) return category;
  throw new HTTPException(400, { message: "Unknown blog category." });
}

function decodeCategory(value: string) {
  let category: string;
  try {
    category = decodeURIComponent(value);
  } catch {
    throw new HTTPException(400, { message: "Invalid blog category." });
  }
  if (isBlogCategory(category)) return category;
  throw new HTTPException(404, { message: "Blog category not found." });
}

function privacyLevel(form: Record<string, unknown>) {
  const value = Number(field(form, "privacy") || "0");
  if (Number.isInteger(value) && value >= 0 && value <= 2) return value;
  throw new HTTPException(400, { message: "Unknown blog privacy setting." });
}
