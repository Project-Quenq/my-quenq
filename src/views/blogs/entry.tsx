import type { BlogItem, CommentItem } from "../../models.js";
import { anchors } from "../../anchors.js";
import { canModerateTarget, isAdminUser } from "../../roles.js";
import type { CurrentUser } from "../../currentUser.js";
import { ActionBar, ActionLabel } from "../../ui/actions.js";
import { CommentPanel } from "../../ui/comments.js";
import { UserContent } from "../../ui/userContent.js";
import { PropAction } from "../../ui/engagement.js";
import { CsrfInput } from "../../ui/forms.js";
import { Icon } from "../../ui/icons.js";
import { MetaSubjectLink } from "../../ui/meta.js";
import { blogCommentsPath, blogPath, profileBlogPath, profilePath, reportPath } from "../../paths.js";
import { absoluteUrl } from "../../server/indexing/urls.js";
import { plainTextFromHtml } from "../../server/security/html.js";
import { seoText, type PageSeo } from "../../settings/seo.js";
import { AuthorSkinStyles } from "../../skins/rendering.js";
import { Layout, SplitLayout, SplitPane } from "../../shell/index.js";

export function BlogEntryPage(props: {
  user: CurrentUser | null;
  csrf: string;
  blog: BlogItem;
  comments: CommentItem[];
  commentsHref?: string | null;
  fullComments?: boolean;
}) {
  const canEdit = props.user?.id === props.blog.authorId || isAdminUser(props.user);
  const canDelete = canEdit || Boolean(props.user && canModerateTarget(props.user, { id: props.blog.authorId, role: props.blog.authorRole }));
  const href = blogPath(props.blog);
  const engagementActions = props.user ? (
    <PropAction
      action={`${href}/${props.blog.proppedByViewer ? "unprop" : "prop"}`}
      csrf={props.csrf}
      count={props.blog.propsCount}
      propped={Boolean(props.blog.proppedByViewer)}
    />
  ) : null;
  const managementActions = canDelete ? (
    <>
      {canEdit ? <a href={`${href}/edit`}><ActionLabel action="edit">Edit</ActionLabel></a> : null}
      <form method="post" action={`${href}/delete`} class="inline-form">
        <CsrfInput csrf={props.csrf} />
        <button class="button--danger" type="submit"><ActionLabel action="delete">Delete</ActionLabel></button>
      </form>
    </>
  ) : null;
  return (
    <Layout title={props.blog.title} user={props.user} head={<AuthorSkinStyles items={props.comments} />} seo={blogSeo(props.blog)}>
      <SplitLayout variant="article" itemscope itemtype="http://schema.org/Article">
        <SplitPane area="aside">
          <div class="context-card">
            <div class="author-details">
              <h4>Published by <MetaSubjectLink href={profilePath(props.blog.authorHandle)}>{props.blog.username}</MetaSubjectLink></h4>
              <p class="content-meta-links inline-actions">
                <a href={profileBlogPath(props.blog.authorHandle)}>
                  <Icon name="blog" /> View blog
                </a>
                {" "}
                <a href={profilePath(props.blog.authorHandle)}>
                  <Icon name="user" /> View profile
                </a>
              </p>
              <p><b>Category:</b> <a href={`/blog/category/${encodeURIComponent(props.blog.category)}`}>{props.blog.category}</a></p>
              {props.user ? null : <p><b>Props:</b> {props.blog.propsCount}</p>}
              <p>
                <a href={reportPath("blog", props.blog)}>
                  <Icon name="report" /> Report
                </a>
              </p>
            </div>
          </div>
        </SplitPane>
        <SplitPane area="main">
          <h1 id={anchors.blog(props.blog)} class="article-title" itemprop="headline name">{props.blog.title}</h1>
          {engagementActions || managementActions ? <ActionBar className="content-actions" primary={engagementActions} secondary={managementActions} /> : null}
          <UserContent className="article-content" html={props.blog.bodyHtml} itemprop="articleBody" />
          {props.blog.commentsEnabled ? (
            <CommentPanel
              user={props.user}
              csrf={props.csrf}
              comments={props.comments}
              action={blogCommentsPath(props.blog)}
              deleteOwnerIds={[props.blog.authorId]}
              deleteAction="/b/comments"
              reportType="blog_comment"
              fullHref={props.commentsHref ?? undefined}
              fullComments={props.fullComments}
            />
          ) : <p><i>Comments are disabled for this entry.</i></p>}
        </SplitPane>
      </SplitLayout>
    </Layout>
  );
}

function blogSeo(blog: BlogItem): PageSeo {
  if (blog.privacyLevel !== 0) return { noindex: true };

  const path = blogPath(blog);
  const description = seoText(plainTextFromHtml(blog.bodyHtml), 180);
  const authorUrl = absoluteUrl(profilePath(blog.authorHandle));
  return {
    canonicalPath: path,
    description,
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "BlogPosting",
      headline: blog.title,
      description,
      url: absoluteUrl(path),
      mainEntityOfPage: absoluteUrl(path),
      datePublished: blog.createdAt,
      dateModified: blog.updatedAt,
      author: {
        "@type": "Person",
        name: blog.username,
        url: authorUrl
      }
    },
    modifiedTime: blog.updatedAt,
    publishedTime: blog.createdAt,
    title: blog.title,
    type: "article"
  };
}
