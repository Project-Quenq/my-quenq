import type { BlogItem } from "../../models.js";
import { blogCategories, defaultBlogCategory, limits } from "../../policy.js";
import type { CurrentUser } from "../../currentUser.js";
import { blogBodyTextFromHtml } from "../../server/security/html.js";
import { ActionLabel } from "../../ui/actions.js";
import { CsrfInput, FormActions, FormError, FormField, FormStack } from "../../ui/forms.js";
import { Layout, SplitLayout, SplitPane } from "../../shell/index.js";
import { blogPath } from "../../paths.js";

export function NewBlogPage(props: { user: CurrentUser; csrf: string; message?: string }) {
  return <BlogEditorPage title="Create blog entry" action="/blog/new" submitLabel="Publish blog entry" {...props} />;
}

export function EditBlogPage(props: { user: CurrentUser; csrf: string; blog: BlogItem; message?: string }) {
  return <BlogEditorPage title="Edit blog entry" action={`${blogPath(props.blog)}/edit`} submitLabel="Save" {...props} />;
}

function BlogEditorPage(props: {
  user: CurrentUser;
  csrf: string;
  action: string;
  blog?: BlogItem;
  message?: string;
  submitLabel: string;
  title: string;
}) {
  const blog = props.blog;
  return (
    <Layout title={props.title} user={props.user}>
      <SplitLayout variant="editor">
        <SplitPane area="aside">
          <div class="context-card">
            <BlogFormattingHelp />
          </div>
        </SplitPane>
        <SplitPane area="main">
          <h1>{props.title}</h1>
          <FormError>{props.message}</FormError>
          <FormStack action={props.action}>
            <CsrfInput csrf={props.csrf} />
            <FormField label={blog ? "Title" : "Subject"}>
              <input
                type="text"
                name="title"
                autocomplete="off"
                placeholder={blog ? "Title" : undefined}
                required
                maxLength={limits.shortText}
                value={blog?.title ?? ""}
              />
            </FormField>
            <BlogOptions blog={blog} />
            <BlogBodyField value={blog ? blogBodyTextFromHtml(blog.bodyHtml) : undefined} />
            <FormActions>
              <button type="submit"><ActionLabel action={blog ? "save" : "post"}>{props.submitLabel}</ActionLabel></button>
            </FormActions>
          </FormStack>
        </SplitPane>
      </SplitLayout>
    </Layout>
  );
}

function BlogBodyField(props: { value?: string }) {
  return (
    <FormField label="Content">
      <textarea class="text-editor" name="body" rows={14} required maxLength={limits.contentBody}>{props.value ?? ""}</textarea>
    </FormField>
  );
}

function BlogFormattingHelp() {
  return (
    <div class="formatting-help">
      <h3>Formatting</h3>
      <p>Write normally. Line breaks become line breaks.</p>
      <div class="formatting-help__examples">
        <code>[h2]Section[/h2]</code>
        <code>[h3]Small section[/h3]</code>
        <code>[b]bold[/b]</code>
        <code>[i]italic[/i]</code>
        <code>[u]underline[/u]</code>
        <code>[code]inline code[/code]</code>
        <code>[quote]quoted text[/quote]</code>
        <code>[url]https://example.com[/url]</code>
        <code>[url=https://example.com]label[/url]</code>
        <code>[list] [*] one [*] two [/list]</code>
        <code>[olist] [*] first [*] second [/olist]</code>
      </div>
    </div>
  );
}

function BlogOptions(props: { blog?: BlogItem }) {
  const blog = props.blog;
  return (
    <div class="form-options">
      <FormField label="Category">
        <select name="category" required>
          {blogCategories.map((category) => <option value={category} selected={(blog?.category ?? defaultBlogCategory) === category}>{category}</option>)}
        </select>
      </FormField>
      <FormField label="Privacy">
        <select name="privacy">
          <option value="0" selected={(blog?.privacyLevel ?? 0) === 0}>Everyone</option>
          <option value="1" selected={blog?.privacyLevel === 1}>Friends only</option>
          <option value="2" selected={blog?.privacyLevel === 2}>Private diary</option>
        </select>
      </FormField>
      <div class="form-checks">
        <label><input type="checkbox" name="commentsEnabled" value="1" checked={(blog?.commentsEnabled ?? 1) === 1} /> Enable comments</label>
        {blog ? <label><input type="checkbox" name="pinned" value="1" checked={Boolean(blog.pinned)} /> Pin to blog</label> : null}
      </div>
    </div>
  );
}
