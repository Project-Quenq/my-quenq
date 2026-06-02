import type { PersonCard } from "../../models.js";
import type { CurrentUser } from "../../currentUser.js";
import { ActionLabel } from "../../ui/actions.js";
import { CsrfInput } from "../../ui/forms.js";
import { PaginationNav } from "../../ui/pagination.js";
import { PeopleBox, PersonActionCard } from "../../ui/people.js";
import { Layout, PageFrame, type PageSeo } from "../../shell/index.js";

export function PeoplePage(props: {
  user: CurrentUser | null;
  title: string;
  people: PersonCard[];
  nextHref?: string | null;
  resetHref?: string | null;
  seo?: PageSeo;
}) {
  return (
    <Layout title={props.title} user={props.user} seo={props.seo}>
      <PageFrame title={props.title}>
        <PeopleBox title={props.title} people={props.people} />
        <PaginationNav nextHref={props.nextHref} nextLabel="Older users" resetHref={props.resetHref} resetLabel="Newest users" />
      </PageFrame>
    </Layout>
  );
}

export function RequestsPage(props: { user: CurrentUser; csrf: string; received: PersonCard[]; sent: PersonCard[] }) {
  return (
    <Layout title="Friend requests" user={props.user}>
      <PageFrame title="Friend requests">
        <p><b><span class="count">{props.received.length}</span> open friend requests</b></p>
        {props.received.length ? props.received.map((person) => (
          <PersonActionCard person={person}>
            <form method="post" action="/friends">
              <CsrfInput csrf={props.csrf} />
              <input type="hidden" name="id" value={person.id} />
              <button name="action" value="accept" type="submit"><ActionLabel action="apply">Accept</ActionLabel></button>
              <button class="button--danger" name="action" value="remove" type="submit"><ActionLabel action="delete">Reject</ActionLabel></button>
            </form>
          </PersonActionCard>
        )) : <p><i>No open friend requests.</i></p>}
        <hr />
        <h2>Sent requests</h2>
        <p><b><span class="count">{props.sent.length}</span> open friend requests</b></p>
        {props.sent.length ? props.sent.map((person) => (
          <PersonActionCard person={person}>
            <form method="post" action="/friends">
              <CsrfInput csrf={props.csrf} />
              <input type="hidden" name="id" value={person.id} />
              <button class="button--secondary" name="action" value="remove" type="submit"><ActionLabel action="delete">Cancel friend request</ActionLabel></button>
            </form>
          </PersonActionCard>
        )) : <p><i>You have no pending sent friend requests.</i></p>}
      </PageFrame>
    </Layout>
  );
}

export function BlocksPage(props: { user: CurrentUser; csrf: string; people: PersonCard[] }) {
  return (
    <Layout title="Blocked users" user={props.user}>
      <PageFrame title="Blocked users">
        {props.people.length ? props.people.map((person) => (
          <PersonActionCard person={person}>
            <form method="post" action="/blocks">
              <CsrfInput csrf={props.csrf} />
              <input type="hidden" name="id" value={person.id} />
              <input type="hidden" name="action" value="unblock" />
              <button class="button--secondary" type="submit"><ActionLabel action="unlock">Unblock</ActionLabel></button>
            </form>
          </PersonActionCard>
        )) : <p><i>You have not blocked any users.</i></p>}
      </PageFrame>
    </Layout>
  );
}
