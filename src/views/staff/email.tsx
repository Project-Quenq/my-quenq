import type { EmailOutboxItem } from "../../models.js";
import { limits } from "../../policy.js";
import { CsrfInput, FormActions, FormField, FormStack } from "../../ui/forms.js";
import { Panel } from "../../ui/panels.js";
import { LocalizedTime } from "../../ui/time.js";

export function EmailPanel(props: { csrf: string; outbox: EmailOutboxItem[] }) {
  return (
    <Panel title="Email outbox">
      <FormStack action="/admin/email/send">
        <CsrfInput csrf={props.csrf} />
        <FormField label="To">
          <input type="email" name="to" required maxLength={limits.emailMax} placeholder="user@example.test" />
        </FormField>
        <FormField label="Subject">
          <input type="text" name="subject" required maxLength={limits.shortText} placeholder="Subject" />
        </FormField>
        <FormField label="Body">
          <textarea name="body" rows={4} required maxLength={limits.userText}></textarea>
        </FormField>
        <FormActions>
          <button type="submit">Queue email</button>
        </FormActions>
      </FormStack>
      {props.outbox.length ? props.outbox.map((email) => <EmailDetails email={email} />) : <p><i>No queued email.</i></p>}
    </Panel>
  );
}

function EmailDetails({ email }: { email: EmailOutboxItem }) {
  return (
    <details>
      <summary>
        {email.toEmail} | {email.subject} | {email.sentAt ? <>sent <LocalizedTime value={email.sentAt} /></> : email.deliveryError ? "delivery failed" : "queued"} | <LocalizedTime value={email.createdAt} />
      </summary>
      {email.deliveryError ? <p>{email.deliveryError}</p> : null}
      <pre class="text-block">{email.bodyText}</pre>
    </details>
  );
}
