import type { CurrentUser } from "../../currentUser.js";
import { limits } from "../../policy.js";
import { ActionLabel } from "../../ui/actions.js";
import { CsrfInput, FormActions, FormError, FormField, FormStack } from "../../ui/forms.js";
import { BackToPage } from "../../ui/links.js";
import { Layout, PageFrame } from "../../shell/index.js";

export function DeleteAccountPage(props: { user: CurrentUser; csrf: string; message?: string }) {
  return (
    <Layout title="Delete account" user={props.user}>
      <PageFrame back={<BackToPage page="settings" />} title="Delete account">
        <FormError>{props.message}</FormError>
        <FormStack action="/account/delete">
          <CsrfInput csrf={props.csrf} />
          <FormField label="Password">
            <input type="password" name="password" required autocomplete="current-password" maxLength={limits.passwordMax} />
          </FormField>
          <FormField label="Type DELETE">
            <input type="text" name="confirm" required autocomplete="off" />
          </FormField>
          <FormActions>
            <button class="button--danger" type="submit"><ActionLabel action="delete">Delete account</ActionLabel></button>
          </FormActions>
        </FormStack>
      </PageFrame>
    </Layout>
  );
}
