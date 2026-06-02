import { newMessagePath } from "../../paths.js";
import { limits } from "../../policy.js";
import { Layout, PageFrame } from "../../shell/index.js";
import { ActionLabel } from "../../ui/actions.js";
import { CsrfInput, FormActions, FormError, FormField, FormStack } from "../../ui/forms.js";
import type { NewMessagePageProps } from "./types.js";

export function NewMessagePage(props: NewMessagePageProps) {
  const title = props.title ?? "Send message";
  const recipientValue = props.recipientInput ?? props.recipient?.handle ?? "";
  return (
    <Layout title={title} user={props.user}>
      <PageFrame title={title}>
        <FormError>{props.message}</FormError>
        <FormStack action={newMessagePath()}>
          <CsrfInput csrf={props.csrf} />
          <FormField label="To handle">
            <input type="text" name="to" required autocomplete="username" maxLength={limits.handleMax + 1} placeholder="handle" value={recipientValue} />
          </FormField>
          <FormField label="Subject">
            <input type="text" name="subject" required maxLength={limits.shortText} value={props.subject ?? ""} />
          </FormField>
          <FormField label="Message">
            <textarea name="body" rows={8} required maxLength={limits.userText}>{props.body ?? ""}</textarea>
          </FormField>
          <FormActions>
            <button type="submit"><ActionLabel action="send">Send</ActionLabel></button>
          </FormActions>
        </FormStack>
      </PageFrame>
    </Layout>
  );
}
