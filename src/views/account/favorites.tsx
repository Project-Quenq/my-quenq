import type { PersonCard } from "../../models.js";
import type { CurrentUser } from "../../currentUser.js";
import { ActionLabel } from "../../ui/actions.js";
import { CsrfInput } from "../../ui/forms.js";
import { PersonActionCard } from "../../ui/people.js";
import { Layout, PageFrame } from "../../shell/index.js";

export function FavoritesPage(props: { user: CurrentUser; csrf: string; people: PersonCard[] }) {
  return (
    <Layout title="Your favorites" user={props.user}>
      <PageFrame title="Your favorites">
        <p>Click on <b>Add to favorites</b> on any profile to add a user to this list.</p>
        {props.people.length ? props.people.map((person) => (
          <PersonActionCard person={person}>
            <form method="post" action="/favorites">
              <CsrfInput csrf={props.csrf} />
              <input type="hidden" name="id" value={person.id} />
              <button class="button--secondary" type="submit"><ActionLabel action="favorite">Remove favorite</ActionLabel></button>
            </form>
          </PersonActionCard>
        )) : <p><i>You haven't added any users to your favorites yet.</i></p>}
      </PageFrame>
    </Layout>
  );
}
