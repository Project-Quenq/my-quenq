import type { CurrentUser } from "../../currentUser.js";
import { FormError, FormSuccess } from "../../ui/forms.js";
import { Layout, PageFrame } from "../../shell/index.js";

export function VerifyPage(props: { user: CurrentUser | null; message: string; success: boolean }) {
  return (
    <Layout title="Email verification" user={props.user}>
      <PageFrame title="Email verification">
        {props.success ? <FormSuccess>{props.message}</FormSuccess> : <FormError>{props.message}</FormError>}
      </PageFrame>
    </Layout>
  );
}
