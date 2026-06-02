import type { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { anchors } from "../../anchors.js";
import { requireAuth, requireOwnerOrAdmin, requireProfile, requireSkin, visibleProfile } from "../../server/access.js";
import { csrfToken, currentUser } from "../../server/auth/session.js";
import { scanAutomodSubmission } from "../../server/db/automod.js";
import { brandingSettings } from "../../server/db/branding.js";
import {
  addSkinComment,
  createSkin,
  deleteSkin,
  deleteSkinComment,
  listSkins,
  skinCommentsFor,
  updateSkin
} from "../../server/db/skins.js";
import { audit, moderationSubjectAuditMetadata } from "../../server/db/moderation/index.js";
import { notifySkinComment } from "../../server/db/notifications/index.js";
import { addCommentFromForm, deleteCommentFromRoute } from "../../server/comments/actions.js";
import { updateProfile } from "../../server/db/users.js";
import { field } from "../../server/forms.js";
import { badFormRequestMessage, localBack, requiredField, requiredUserText, routeId, verifiedActionForm, withFragment } from "../../server/http.js";
import { canDeleteAsOwnerOrModerator, canModerateAuthor } from "../../server/moderation/guards.js";
import { previewFromRows } from "../../server/pagination.js";
import { limits } from "../../policy.js";
import { isAdminUser } from "../../roles.js";
import { isSkinColorGenerateIntent, skinColorPaletteFromHtml, skinStyleCodeFromColorForm } from "../../skins/colorPalette.js";
import { sanitizeSkinHtml } from "../../server/security/html.js";
import type { CurrentUser } from "../../currentUser.js";
import type { SkinItem } from "../../models.js";
import type { AppBindings, AppContext } from "../../server/context.js";
import { SkinDetailPage, SkinFormPage, SkinListPage, SkinPreviewPage, type SkinFormDraft } from "../../views/skins/index.js";
import { profilePageData } from "../profile/profilePageData.js";
import { skinCommentsPath, skinPath } from "../../paths.js";

export function registerSkinRoutes(app: Hono<AppBindings>) {
  app.get("/skins", (c) => {
    const user = currentUser(c);
    return c.html(<SkinListPage user={user} skins={listSkins(user)} />);
  });
  app.get("/skins/new", (c) => c.html(<SkinFormPage user={requireAuth(c)} csrf={csrfToken(c)} skinColorPaletteFallback={brandingSettings().palette} />));
  app.post("/skins/new", async (c) => {
    const user = requireAuth(c);
    const form = await verifiedActionForm(c, "skin.create");
    if (isSkinColorGenerateIntent(form)) return skinFormGenerate(c, user, form);
    try {
      const fields = skinFields(form);
      const id = createSkin(user.id, fields.title, fields.descriptionHtml, fields.codeHtml);
      fields.automod.createReports({ subjectType: "skin", subjectId: id, authorId: user.id });
      return c.redirect(skinPath(id));
    } catch (error) {
      const message = badFormRequestMessage(error);
      if (message) return skinFormError(c, user, message, undefined, skinDraftFromForm(form));
      throw error;
    }
  });
  app.get("/s/:id/preview", (c) => {
    const user = requireAuth(c);
    const skin = viewableSkin(c);
    const profile = { ...requireProfile(user.id), skinHtml: skin.codeHtml };
    return c.html(
      <SkinPreviewPage
        user={user}
        skin={skin}
        profileProps={profilePageData({ user, csrf: csrfToken(c), profile })}
      />
    );
  });
  app.get("/s/:id/edit", (c) => {
    const user = requireAuth(c);
    const skin = requireSkin(routeId(c));
    requireSkinOwnerOrAdmin(user, skin);
    return c.html(<SkinFormPage user={user} csrf={csrfToken(c)} skin={skin} skinColorPaletteFallback={brandingSettings().palette} />);
  });
  app.post("/s/:id/edit", async (c) => {
    const user = requireAuth(c);
    const form = await verifiedActionForm(c, "content.write");
    const skin = requireSkin(routeId(c));
    requireSkinOwnerOrAdmin(user, skin);
    if (isSkinColorGenerateIntent(form)) return skinFormGenerate(c, user, form, skin);
    try {
      const fields = skinFields(form);
      updateSkin(skin.authorId, skin.id, fields.title, fields.descriptionHtml, fields.codeHtml);
      fields.automod.createReports({ subjectType: "skin", subjectId: skin.id, authorId: skin.authorId ?? user.id });
      return c.redirect(skinPath(skin));
    } catch (error) {
      const message = badFormRequestMessage(error);
      if (message) return skinFormError(c, user, message, skin, skinDraftFromForm(form));
      throw error;
    }
  });
  app.post("/s/:id/apply", async (c) => {
    const user = requireAuth(c);
    await verifiedActionForm(c, "profile.write");
    const skin = viewableSkin(c);
    updateProfile(user.id, { skinHtml: skin.codeHtml });
    return c.redirect(withFragment("/account/profile", "skin"));
  });
  app.post("/s/:id/delete", async (c) => {
    const user = requireAuth(c);
    await verifiedActionForm(c, "content.write");
    const skin = requireSkin(routeId(c));
    if (!canDeleteSkin(user, skin)) throw new HTTPException(403, { message: "You cannot delete this skin." });
    const elevated = skin.authorId !== null && canModerateAuthor(user, skin.authorId) && user.id !== skin.authorId;
    const auditMetadata = elevated ? moderationSubjectAuditMetadata("skin", skin.id) : {};
    deleteSkin(skin.id, user.id, elevated);
    if (elevated) audit(user.id, "delete", "skin", skin.id, "", auditMetadata);
    return c.redirect("/skins");
  });
  app.post("/s/:id/comments", async (c) => {
    const user = requireAuth(c);
    const form = await verifiedActionForm(c, "comment.create");
    const skin = viewableSkin(c);
    const reply = Boolean(field(form, "parentId"));
    return addCommentFromForm(c, user, {
      form,
      subjectType: "skin_comment",
      redirect: (commentId) =>
        localBack(c, reply ? skinCommentsPath(skin) : skinPath(skin), {
          avoid: reply ? [skinPath(skin)] : undefined,
          fragment: anchors.comment(commentId)
        }),
      add: (textHtml, parentId) => addSkinComment(skin.id, user.id, textHtml, parentId, user),
      afterAdd: notifySkinComment
    });
  });
  app.post("/s/comments/:id/delete", (c) =>
    deleteCommentFromRoute(c, { subjectType: "skin_comment", delete: deleteSkinComment, fallback: "/skins", redirectFragment: anchors.comments })
  );
  app.get("/s/:id/comments", (c) => skinPage(c, true));
  app.get("/s/:id", (c) => skinPage(c));
}

function skinPage(c: AppContext, fullComments = false) {
  const user = currentUser(c);
  const skin = viewableSkin(c);
  const commentsHref = skinCommentsPath(skin);
  const commentRows = skinCommentsFor(skin.id, user, fullComments ? undefined : limits.commentsPage + 1);
  const comments = fullComments ? { items: commentRows, hasMore: false } : previewFromRows(commentRows, limits.commentsPage);
  return c.html(
    <SkinDetailPage
      user={user}
      csrf={csrfToken(c)}
      skin={skin}
      comments={comments.items}
      commentsHref={comments.hasMore ? commentsHref : null}
      fullComments={fullComments}
    />
  );
}

function viewableSkin(c: AppContext) {
  const skin = requireSkin(routeId(c));
  if (skin.authorId !== null) visibleProfile(c, skin.authorId);
  return skin;
}

function requireSkinOwnerOrAdmin(user: CurrentUser, skin: SkinItem) {
  if (skin.authorId === null) {
    if (!isAdminUser(user)) throw new HTTPException(403, { message: "You cannot edit this skin." });
    return;
  }
  requireOwnerOrAdmin(user, skin.authorId, "You cannot edit this skin.");
}

function canDeleteSkin(user: CurrentUser, skin: SkinItem) {
  return skin.authorId === null
    ? isAdminUser(user)
    : canDeleteAsOwnerOrModerator(user, skin.authorId, [skin.authorId]);
}

function skinFields(form: Record<string, unknown>) {
  const fields = {
    title: requiredField(form, "title", limits.shortText, "Title is required."),
    descriptionHtml: requiredUserText(form, "description", limits.userText, "Description is required."),
    codeHtml: requiredSkinHtml(form)
  };
  return { ...fields, automod: scanAutomodSubmission("skin", fields.title, fields.descriptionHtml, fields.codeHtml) };
}

function requiredSkinHtml(form: Record<string, unknown>) {
  const raw = field(form, "code").slice(0, limits.skinHtml);
  if (!raw) throw new HTTPException(400, { message: "Skin HTML is required." });
  const html = sanitizeSkinHtml(raw);
  if (!html.trim()) throw new HTTPException(400, { message: "Skin HTML must include allowed markup." });
  return html;
}

function skinFormGenerate(c: AppContext, user: CurrentUser, form: Record<string, unknown>, skin?: SkinItem) {
  const palette = brandingSettings().palette;
  const fallback = skinColorPaletteFromHtml(field(form, "code") || skin?.codeHtml || "", palette);
  return c.html(
    <SkinFormPage
      user={user}
      csrf={csrfToken(c)}
      skin={skin}
      skinColorPaletteFallback={palette}
      draft={skinDraftFromForm(form, skinStyleCodeFromColorForm(form, fallback))}
    />
  );
}

function skinDraftFromForm(form: Record<string, unknown>, code = field(form, "code")): SkinFormDraft {
  return {
    code: code.slice(0, limits.skinHtml),
    description: field(form, "description").slice(0, limits.userText),
    title: field(form, "title").slice(0, limits.shortText)
  };
}

function skinFormError(c: AppContext, user: CurrentUser, message: string, skin?: SkinItem, draft?: SkinFormDraft) {
  return c.html(
    <SkinFormPage
      user={user}
      csrf={csrfToken(c)}
      skin={skin}
      skinColorPaletteFallback={brandingSettings().palette}
      draft={draft}
      message={message}
    />,
    400
  );
}
