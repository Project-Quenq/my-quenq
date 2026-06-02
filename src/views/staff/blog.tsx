import type { BlogItem } from "../../models.js";
import { ActionLabel } from "../../ui/actions.js";
import { CsrfInput } from "../../ui/forms.js";
import { MetaSubjectLink } from "../../ui/meta.js";
import { Panel } from "../../ui/panels.js";
import { blogPath, profilePath } from "../../paths.js";

export function BlogToolsPanel(props: { csrf: string; blogs: BlogItem[] }) {
  return (
    <Panel title="Blog tools">
      {props.blogs.length ? props.blogs.map((blog) => (
        <div class="inline-actions">
          <a href={blogPath(blog)}>{blog.title}</a> by <MetaSubjectLink href={profilePath(blog.authorHandle)}>{blog.username}</MetaSubjectLink>{" "}
          <form method="post" action={`/admin/blog/${blog.id}/delete`} class="inline-form">
            <CsrfInput csrf={props.csrf} />
            <button class="button--danger" type="submit"><ActionLabel action="delete">Delete</ActionLabel></button>
          </form>
        </div>
      )) : <p><i>No blog entries.</i></p>}
    </Panel>
  );
}
