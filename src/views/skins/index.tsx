import type { CommentItem, SkinItem } from "../../models.js";
import { limits } from "../../policy.js";
import { canModerateTarget, isAdminUser } from "../../roles.js";
import { plainTextFromHtml, userTextFromHtml } from "../../server/security/html.js";
import type { CurrentUser } from "../../currentUser.js";
import { truncateText } from "../../text.js";
import { ActionBar, ActionLabel } from "../../ui/actions.js";
import { CommentPanel } from "../../ui/comments.js";
import { UserContent } from "../../ui/userContent.js";
import { CsrfInput, FormActions, FormError, FormField, FormStack } from "../../ui/forms.js";
import { BackLink, BackToPage } from "../../ui/links.js";
import { MetaSubjectLink } from "../../ui/meta.js";
import { profilePath, reportPath, skinCommentsPath, skinPath } from "../../paths.js";
import { absoluteUrl } from "../../server/indexing/urls.js";
import { seoText, type PageSeo } from "../../settings/seo.js";
import { Layout, PageFrame } from "../../shell/index.js";
import { ProfileLayout, type ProfilePageProps } from "../profile/index.js";
import { builtinSkinAttribution } from "../../skins/builtin.js";
import { skinBrowserThemeColorFromHtml } from "../../skins/colorPalette.js";
import { ProfileSkinDocsLink, ProfileSkinHtmlHint } from "../../skins/docs.js";
import { AuthorSkinStyles, profileSkinFromHtml, profileSkinPageAttributes, ProfileSkinStyles } from "../../skins/rendering.js";
import { SkinColorPaletteEditor, skinColorPaletteEditorStylesheet } from "../../skins/colorPaletteEditor.js";
import type { ColorPalette } from "../../theme/colorPalette.js";

export type SkinFormDraft = {
  code?: string;
  description?: string;
  title?: string;
};

type SkinFormPageProps = {
  user: CurrentUser;
  csrf: string;
  skinColorPaletteFallback: ColorPalette;
  skin?: SkinItem;
  draft?: SkinFormDraft;
  message?: string;
};

export function SkinListPage(props: { user: CurrentUser | null; skins: SkinItem[] }) {
  return (
    <Layout title="Skins" user={props.user} seo={{ canonicalPath: "/skins", description: "Browse profile skins shared by the community." }}>
      <PageFrame title="Skins">
        {props.user ? (
          <ActionBar
            className="content-actions"
            primary={<a class="button" href="/skins/new"><ActionLabel action="add">Submit skin</ActionLabel></a>}
            secondary={<ProfileSkinDocsLink />}
          />
        ) : <p><ProfileSkinDocsLink /></p>}
        {props.skins.length ? props.skins.map((skin) => <SkinSummaryCard skin={skin} />) : <p>No skins have been submitted yet.</p>}
      </PageFrame>
    </Layout>
  );
}

export function SkinSummaryCard({ skin, preview = false }: { skin: SkinItem; preview?: boolean }) {
  return (
    <div class="content-card">
      <h3><a href={skinPath(skin)}>{skin.title}</a></h3>
      <p class="card-attribution">By <SkinAuthorLink skin={skin} /></p>
      {preview ? <p>{truncateText(plainTextFromHtml(skin.descriptionHtml), 180)}</p> : <UserContent html={skin.descriptionHtml} />}
    </div>
  );
}

export function SkinFormPage(props: SkinFormPageProps) {
  const skin = props.skin;
  const title = props.draft?.title ?? skin?.title ?? "";
  const description = props.draft?.description ?? (skin ? userTextFromHtml(skin.descriptionHtml) : "");
  const code = props.draft?.code ?? skin?.codeHtml ?? "";
  return (
    <Layout title={skin ? "Edit skin" : "Submit skin"} user={props.user} styles={[skinColorPaletteEditorStylesheet]}>
      <PageFrame
        back={skin ? <BackLink href={skinPath(skin)} label={skin.title} /> : <BackToPage page="skins" />}
        title={skin ? "Edit skin" : "Submit skin"}
      >
        <FormError>{props.message}</FormError>
        <FormStack action={skin ? `${skinPath(skin)}/edit` : "/skins/new"}>
          <CsrfInput csrf={props.csrf} />
          <FormField label="Title">
            <input type="text" name="title" required maxLength={limits.shortText} placeholder="Title" value={title} />
          </FormField>
          <FormField label="Description">
            <textarea name="description" rows={5} required maxLength={limits.userText} placeholder="Description">{description}</textarea>
          </FormField>
          <SkinColorPaletteEditor codeHtml={code} fallback={props.skinColorPaletteFallback} />
          <FormField label="Skin HTML" hint={<ProfileSkinHtmlHint />}>
            <textarea name="code" rows={12} required maxLength={limits.skinHtml} placeholder="Skin HTML">{code}</textarea>
          </FormField>
          <FormActions>
            <button type="submit"><ActionLabel action={skin ? "save" : "post"}>{skin ? "Save" : "Submit"}</ActionLabel></button>
          </FormActions>
        </FormStack>
      </PageFrame>
    </Layout>
  );
}

export function SkinDetailPage(props: {
  user: CurrentUser | null;
  csrf: string;
  skin: SkinItem;
  comments: CommentItem[];
  commentsHref?: string | null;
  fullComments?: boolean;
}) {
  const canEdit = props.skin.authorId === null ? isAdminUser(props.user) : props.user?.id === props.skin.authorId || isAdminUser(props.user);
  const canDelete =
    canEdit || Boolean(props.user && props.skin.authorId !== null && canModerateTarget(props.user, { id: props.skin.authorId, role: props.skin.authorRole }));
  const href = skinPath(props.skin);
  const primaryActions = (
    <>
      {props.user ? <a href={`${href}/preview`}>Preview on your profile</a> : <a href="/login">Log in to preview</a>}
      {props.user ? (
        <form method="post" action={`${href}/apply`} class="inline-form">
          <CsrfInput csrf={props.csrf} />
          <button type="submit"><ActionLabel action="apply">Apply skin</ActionLabel></button>
        </form>
      ) : null}
    </>
  );
  const managementActions = (
    <>
      <a href={reportPath("skin", props.skin)}><ActionLabel action="report">Report</ActionLabel></a>
      {canDelete ? (
        <>
          {canEdit ? <a href={`${href}/edit`}><ActionLabel action="edit">Edit</ActionLabel></a> : null}
          <form method="post" action={`${href}/delete`} class="inline-form">
            <CsrfInput csrf={props.csrf} />
            <button class="button--danger" type="submit"><ActionLabel action="delete">Delete</ActionLabel></button>
          </form>
        </>
      ) : null}
    </>
  );
  return (
    <Layout title={props.skin.title} user={props.user} head={<AuthorSkinStyles items={props.comments} />} seo={skinSeo(props.skin)}>
      <PageFrame
        back={props.fullComments ? <BackLink href={href} label={props.skin.title} /> : <BackToPage page="skins" />}
        title={props.skin.title}
      >
        <p>By <SkinAuthorLink skin={props.skin} /></p>
        <ActionBar className="content-actions" primary={primaryActions} secondary={managementActions} />
        <UserContent html={props.skin.descriptionHtml} />
        <h3>Code</h3>
        <textarea rows={10} readonly>{props.skin.codeHtml}</textarea>
        <CommentPanel
          user={props.user}
          csrf={props.csrf}
          comments={props.comments}
          action={skinCommentsPath(props.skin)}
          deleteOwnerIds={skinOwnerIds(props.skin)}
          deleteAction="/s/comments"
          reportType="skin_comment"
          fullHref={props.commentsHref ?? undefined}
          fullComments={props.fullComments}
        />
      </PageFrame>
    </Layout>
  );
}

function skinSeo(skin: SkinItem): PageSeo {
  const path = skinPath(skin);
  const description = seoText(plainTextFromHtml(skin.descriptionHtml), 180);
  const author = skinAuthorAttribution(skin);
  return {
    canonicalPath: path,
    description,
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "CreativeWork",
      name: skin.title,
      description,
      url: absoluteUrl(path),
      datePublished: skin.createdAt,
      dateModified: skin.updatedAt,
      author: {
        "@type": "Person",
        name: author.name,
        url: absoluteUrl(author.href)
      }
    },
    modifiedTime: skin.updatedAt,
    publishedTime: skin.createdAt,
    title: skin.title,
    type: "article"
  };
}

function SkinAuthorLink({ skin }: { skin: SkinItem }) {
  const author = skinAuthorAttribution(skin);
  return <MetaSubjectLink href={author.href}>{author.name}</MetaSubjectLink>;
}

function skinAuthorAttribution(skin: SkinItem) {
  const builtin = builtinSkinAttribution(skin.sourceKey);
  return builtin ? { name: builtin.name, href: builtin.url } : { name: skin.username, href: profilePath(skin.authorHandle) };
}

function skinOwnerIds(skin: SkinItem) {
  return skin.authorId === null ? [] : [skin.authorId];
}

export function SkinPreviewPage(props: { user: CurrentUser; skin: SkinItem; profileProps: ProfilePageProps }) {
  const skin = profileSkinFromHtml(props.skin.codeHtml);
  return (
    <Layout
      title={`Preview: ${props.skin.title}`}
      user={props.user}
      bodyAttributes={profileSkinPageAttributes(skin)}
      browserThemeColor={(branding) => skinBrowserThemeColorFromHtml(skin.styleHtml, branding.palette)}
      head={<ProfileSkinStyles skin={skin} />}
    >
      <PageFrame back={<BackLink href={skinPath(props.skin)} label={props.skin.title} />} title={props.skin.title} />
      <ProfileLayout {...props.profileProps} skin={skin} />
    </Layout>
  );
}
