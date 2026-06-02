import type { CurrentUser } from "../../currentUser.js";
import { CsrfInput } from "../../ui/forms.js";
import { Layout, PageFrame } from "../../shell/index.js";

export function LogoutPage(props: { user: CurrentUser; csrf: string }) {
  return (
    <Layout title="Log out" user={props.user}>
      <PageFrame title="Log out">
        <form method="post" action="/logout">
          <CsrfInput csrf={props.csrf} />
          <button type="submit">Log out</button>
        </form>
      </PageFrame>
    </Layout>
  );
}
