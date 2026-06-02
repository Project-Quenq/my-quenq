import { limits } from "../../policy.js";
import type { CurrentUser } from "../../currentUser.js";
import { CsrfInput, FormActions, FormError, FormField, FormStack, FormSuccess } from "../../ui/forms.js";
import { Layout, PageFrame } from "../../shell/index.js";

export function ResetRequestPage(props: { user: CurrentUser | null; csrf: string; message?: string }) {
  return (
    <Layout title="Password reset" user={props.user}>
      <PageFrame title="Password reset">
        <FormSuccess>{props.message}</FormSuccess>
        <FormStack action="/reset">
          <CsrfInput csrf={props.csrf} />
          <FormField label="Email">
            <input type="email" name="email" required maxLength={limits.emailMax} autocomplete="email" />
          </FormField>
          <FormActions>
            <button type="submit">Send reset link</button>
          </FormActions>
        </FormStack>
      </PageFrame>
    </Layout>
  );
}

export function ResetUnavailablePage(props: { user: CurrentUser | null }) {
  return (
    <Layout title="Password reset unavailable" user={props.user}>
      <PageFrame title="Password reset unavailable">
        <p>Password reset email delivery is not available on this instance. Contact an administrator for account help.</p>
      </PageFrame>
    </Layout>
  );
}

export function ResetApplyPage(props: { user: CurrentUser | null; csrf: string; token: string; message?: string }) {
  return (
    <Layout title="Set new password" user={props.user}>
      <PageFrame title="Set new password">
        <FormError>{props.message}</FormError>
        <FormStack action={`/reset/${props.token}`}>
          <CsrfInput csrf={props.csrf} />
          <FormField label="New password">
            <input type="password" name="password" required minLength={limits.passwordMin} maxLength={limits.passwordMax} autocomplete="new-password" />
          </FormField>
          <FormField label="Confirm password">
            <input type="password" name="confirm" required minLength={limits.passwordMin} maxLength={limits.passwordMax} autocomplete="new-password" />
          </FormField>
          <FormActions>
            <button type="submit">Change password</button>
          </FormActions>
        </FormStack>
      </PageFrame>
    </Layout>
  );
}
