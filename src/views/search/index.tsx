import type { CurrentUser } from "../../currentUser.js";
import { limits } from "../../policy.js";
import type { SiteSearchResults } from "../../server/db/search.js";
import { Layout, PageFrame } from "../../shell/index.js";
import { ActionLabel } from "../../ui/actions.js";
import { GroupSummaryCard } from "../../ui/groups.js";
import { PeopleBox } from "../../ui/people.js";
import type { ViewChild } from "../../ui/types.js";
import { BlogCardList } from "../blogs/index.js";
import { PostList } from "../posts/index.js";
import { SkinSummaryCard } from "../skins/index.js";
import { AuthorSkinStyles } from "../../skins/rendering.js";

export function SearchPage(props: { user: CurrentUser | null; csrf: string; query: string; results: SiteSearchResults | null }) {
  const hasResults = props.results ? hasSearchResults(props.results) : false;
  return (
    <Layout
      title={props.query ? `Search: ${props.query}` : "Search"}
      user={props.user}
      head={props.results ? <AuthorSkinStyles items={props.results.posts} /> : null}
    >
      <PageFrame title={props.query ? `Search: ${props.query}` : "Search"}>
        <form class="search-form" method="get" action="/search">
          <input type="text" name="q" value={props.query} maxLength={limits.searchQuery} autocomplete="off" aria-label="Search" />
          <button type="submit"><ActionLabel action="search">Search</ActionLabel></button>
        </form>
        {props.results ? (
          hasResults ? <SearchResults user={props.user} csrf={props.csrf} results={props.results} /> : <p><i>Nothing found.</i></p>
        ) : null}
      </PageFrame>
    </Layout>
  );
}

function hasSearchResults(results: SiteSearchResults) {
  return results.people.length > 0 || results.blogs.length > 0 || results.groups.length > 0 || results.posts.length > 0 || results.skins.length > 0;
}

function SearchResults(props: { user: CurrentUser | null; csrf: string; results: SiteSearchResults }) {
  const results = props.results;
  return (
    <>
      {results.people.length ? <PeopleBox title="People" people={results.people} /> : null}
      {results.blogs.length ? (
        <SearchSection title="Blog entries">
          <BlogCardList blogs={results.blogs} empty="" />
        </SearchSection>
      ) : null}
      {results.groups.length ? (
        <SearchSection title="Groups">
          {results.groups.map((group) => <GroupSummaryCard group={group} />)}
        </SearchSection>
      ) : null}
      {results.posts.length ? (
        <SearchSection title="Posts">
          <PostList user={props.user} csrf={props.csrf} posts={results.posts} empty="" />
        </SearchSection>
      ) : null}
      {results.skins.length ? (
        <SearchSection title="Skins">
          {results.skins.map((skin) => <SkinSummaryCard skin={skin} preview />)}
        </SearchSection>
      ) : null}
    </>
  );
}

function SearchSection(props: { title: string; children: ViewChild }) {
  return (
    <section>
      <h2>{props.title}</h2>
      {props.children}
    </section>
  );
}
