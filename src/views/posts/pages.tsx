import type { CommentItem, PostItem } from "../../models.js";
import type { CurrentUser } from "../../currentUser.js";
import { BackToPage } from "../../ui/links.js";
import { PaginationNav } from "../../ui/pagination.js";
import { Layout, PageFrame } from "../../shell/index.js";
import { AuthorSkinStyles } from "../../skins/rendering.js";
import { PostCard, PostList } from "./cards.js";
import { PostComments } from "./comments.js";
import { PostComposer } from "./composer.js";

export function FeedPage(props: { user: CurrentUser; csrf: string; posts: PostItem[]; nextHref?: string | null; resetHref?: string | null }) {
  return (
    <Layout title="Feed" user={props.user} head={<AuthorSkinStyles items={props.posts} />}>
      <PageFrame title="Feed">
        <PostComposer action="/feed" csrf={props.csrf} button="Post" />
        <PostList user={props.user} csrf={props.csrf} posts={props.posts} empty="No posts yet." />
        <PaginationNav nextHref={props.nextHref} nextLabel="Older posts" resetHref={props.resetHref} resetLabel="Newest posts" />
      </PageFrame>
    </Layout>
  );
}

export function PostPage(props: { user: CurrentUser; csrf: string; post: PostItem; comments: CommentItem[]; canInteract: boolean }) {
  return (
    <Layout title="Post" user={props.user} head={<AuthorSkinStyles items={[props.post, ...props.comments]} />}>
      <PageFrame back={<BackToPage page="feed" />}>
        <PostCard user={props.user} csrf={props.csrf} post={props.post} canInteract={props.canInteract} />
        <PostComments user={props.user} csrf={props.csrf} post={props.post} comments={props.comments} canInteract={props.canInteract} />
      </PageFrame>
    </Layout>
  );
}
