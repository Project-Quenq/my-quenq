import type { CurrentUser } from "../../currentUser.js";
import type { BlogListItem } from "../../models.js";
import { blogPath, profilePath } from "../../paths.js";
import { defaultBlogCategory } from "../../policy.js";
import { plainTextFromHtml } from "../../server/security/html.js";
import { Layout, PageFrame, type PageSeo } from "../../shell/index.js";
import { truncateText } from "../../text.js";
import { MetaSubjectLink } from "../../ui/meta.js";

export function BlogListPage(props: { user: CurrentUser | null; title: string; blogs: BlogListItem[]; seo?: PageSeo }) {
  return (
    <Layout title={props.title} user={props.user} seo={props.seo}>
      <PageFrame title={props.title}>
        {props.user ? <h3>[<a href="/blog/new">Create a new blog entry</a>]</h3> : null}
        <BlogCardList blogs={props.blogs} empty="No blog entries found." />
      </PageFrame>
    </Layout>
  );
}

export function BlogCardList(props: { blogs: BlogListItem[]; empty: string }) {
  return (
    <>
      {props.blogs.length ? props.blogs.map((blog) => <BlogCard blog={blog} />) : <p><i>{props.empty}</i></p>}
    </>
  );
}

function BlogCard(props: { blog: BlogListItem }) {
  const blog = props.blog;
  return (
    <div class="content-card">
      <h3><a href={blogPath(blog)}>{blog.title}</a> <small class="blog-card__category">{blog.category ?? defaultBlogCategory}</small></h3>
      {blog.username && blog.authorHandle ? <p class="card-attribution">By <MetaSubjectLink href={profilePath(blog.authorHandle)}>{blog.username}</MetaSubjectLink></p> : null}
      <p>{truncateText(plainTextFromHtml(blog.bodyHtml), 180)}</p>
    </div>
  );
}
