import type { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { csrfToken } from "../../server/auth/session.js";
import { scanAutomodSubmission } from "../../server/db/automod.js";
import { requireAuth, requireGroup, requireOwnerOrAdmin, visibleGroup } from "../../server/access.js";
import {
  createGroup,
  deleteGroup,
  groupMembers,
  isGroupMember,
  joinGroup,
  leaveGroup,
  listGroups,
  updateGroup
} from "../../server/db/groups.js";
import { audit, moderationSubjectAuditMetadata } from "../../server/db/moderation/index.js";
import { postImageFilenamesForGroup, postsForGroupPage } from "../../server/db/posts/index.js";
import { badFormRequestMessage, localBack, requiredField, requiredUserText, routeId, verifiedActionForm } from "../../server/http.js";
import { deletePostImages } from "../../server/media/upload.js";
import { canDeleteAsOwnerOrModerator, canModerateAuthor } from "../../server/moderation/guards.js";
import { beforeParam, paginationHref } from "../../server/pagination.js";
import { limits } from "../../policy.js";
import { groupPath } from "../../paths.js";
import type { AppBindings, AppContext } from "../../server/context.js";
import { GroupFormPage, GroupListPage, GroupPage } from "../../views/groups/index.js";

export function registerGroupRoutes(app: Hono<AppBindings>) {
  app.get("/groups", (c) => {
    const user = requireAuth(c);
    return c.html(<GroupListPage user={user} groups={listGroups(user)} />);
  });
  app.get("/groups/new", (c) => c.html(<GroupFormPage user={requireAuth(c)} csrf={csrfToken(c)} />));
  app.post("/groups/new", async (c) => {
    const user = requireAuth(c);
    const form = await verifiedActionForm(c, "group.create");
    try {
      const fields = groupFields(form);
      const groupId = createGroup(user.id, fields.name, fields.descriptionHtml);
      fields.automod.createReports({ subjectType: "group", subjectId: groupId, authorId: user.id });
    } catch (error) {
      const message = badFormRequestMessage(error);
      if (message) return c.html(<GroupFormPage user={user} csrf={csrfToken(c)} message={message} />, 400);
      throw error;
    }
    return c.redirect("/groups");
  });
  app.post("/g/:id/join", joinGroupAction);
  app.post("/g/:id/leave", leaveGroupAction);
  app.get("/g/:id/edit", (c) => {
    const user = requireAuth(c);
    const group = requireGroup(routeId(c));
    requireOwnerOrAdmin(user, group.ownerId, "You cannot edit this group.");
    return c.html(<GroupFormPage user={user} csrf={csrfToken(c)} group={group} />);
  });
  app.post("/g/:id/edit", async (c) => {
    const user = requireAuth(c);
    const form = await verifiedActionForm(c, "content.write");
    const group = requireGroup(routeId(c));
    requireOwnerOrAdmin(user, group.ownerId, "You cannot edit this group.");
    try {
      const fields = groupFields(form);
      updateGroup(group.ownerId, group.id, fields.name, fields.descriptionHtml);
      fields.automod.createReports({ subjectType: "group", subjectId: group.id, authorId: group.ownerId });
    } catch (error) {
      const message = badFormRequestMessage(error);
      if (message) return c.html(<GroupFormPage user={user} csrf={csrfToken(c)} group={group} message={message} />, 400);
      throw error;
    }
    return c.redirect(groupPath(group));
  });
  app.post("/g/:id/delete", async (c) => {
    const user = requireAuth(c);
    await verifiedActionForm(c, "content.write");
    const group = requireGroup(routeId(c));
    if (!canDeleteAsOwnerOrModerator(user, group.ownerId, [group.ownerId])) throw new HTTPException(403, { message: "You cannot delete this group." });
    const elevated = canModerateAuthor(user, group.ownerId) && user.id !== group.ownerId;
    const auditMetadata = elevated ? moderationSubjectAuditMetadata("group", group.id) : {};
    const postImages = postImageFilenamesForGroup(group.id);
    if (deleteGroup(group.id, user.id, elevated)) await deletePostImages(postImages);
    if (elevated) audit(user.id, "delete", "group", group.id, "", auditMetadata);
    return c.redirect("/groups");
  });
  app.get("/g/:id/posts", (c) => groupPage(c, true));
  app.get("/g/:id", (c) => groupPage(c));
}

function groupPage(c: AppContext, fullPosts = false) {
  const { user, group } = visibleGroup(c, routeId(c));
  const member = isGroupMember(group.id, user.id);
  const before = c.req.query(beforeParam);
  const postsBaseHref = `${groupPath(group)}/posts`;
  const postsPage = fullPosts ? postsForGroupPage(group.id, user, { before, limit: limits.listPage }) : null;
  const postsPreviewPage = fullPosts ? null : postsForGroupPage(group.id, user, { limit: limits.groupPostPreview });
  return c.html(
    <GroupPage
      user={user}
      csrf={csrfToken(c)}
      group={group}
      posts={postsPage ? postsPage.items : postsPreviewPage?.items ?? []}
      members={groupMembers(group.id, user)}
      isMember={member}
      fullPosts={fullPosts}
      postsNextHref={postsPage?.nextCursor ? paginationHref(postsBaseHref, postsPage.nextCursor) : null}
      postsResetHref={postsPage && before ? postsBaseHref : null}
      postsViewAllHref={postsPreviewPage?.nextCursor ? postsBaseHref : null}
    />
  );
}

async function joinGroupAction(c: AppContext) {
  requireAuth(c);
  await verifiedActionForm(c, "relationship.write");
  const { user, group } = visibleGroup(c, routeId(c));
  joinGroup(group.id, user.id);
  return c.redirect(localBack(c, groupPath(group)));
}

async function leaveGroupAction(c: AppContext) {
  const { user, group } = visibleGroup(c, routeId(c));
  await verifiedActionForm(c, "relationship.write");
  leaveGroup(group.id, user.id);
  return c.redirect(localBack(c, groupPath(group)));
}

function groupFields(form: Record<string, unknown>) {
  const name = requiredField(form, "groupname", limits.shortText, "Name is required.");
  const descriptionHtml = requiredUserText(form, "desc", limits.groupText, "Description is required.");
  return { name, descriptionHtml, automod: scanAutomodSubmission("group", name, descriptionHtml) };
}
