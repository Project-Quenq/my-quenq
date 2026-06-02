import type { UserProfile } from "../../../models.js";
import { limits } from "../../../policy.js";
import type { CurrentUser } from "../../../currentUser.js";
import { ActionLabel } from "../../../ui/actions.js";
import { CsrfInput, FormActions, FormField, FormStack } from "../../../ui/forms.js";
import { Layout, PageFrame } from "../../../shell/index.js";

export function ProfileStatusPage(props: { user: CurrentUser; csrf: string; profile: UserProfile }) {
  return (
    <Layout title="Edit status" user={props.user}>
      <PageFrame title="Edit status">
        <FormStack action="/account/status">
          <CsrfInput csrf={props.csrf} />
          <FormField label="Status">
            <input type="text" name="status" value={props.profile.status.status} maxLength={limits.shortText} />
          </FormField>
          <FormField label="Current vibe">
            <input type="text" name="currentVibe" value={props.profile.status.currentVibe} maxLength={limits.shortText} />
          </FormField>
          <FormActions>
            <button type="submit"><ActionLabel action="save">Save</ActionLabel></button>
          </FormActions>
        </FormStack>
      </PageFrame>
    </Layout>
  );
}
