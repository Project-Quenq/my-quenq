import { limits, type ReportSubjectType } from "../../policy.js";
import { reportPathBase } from "../../paths.js";
import type { CurrentUser } from "../../currentUser.js";
import { ActionLabel } from "../../ui/actions.js";
import { CsrfInput, FormActions, FormError, FormField, FormStack, FormSuccess } from "../../ui/forms.js";
import { Layout, PageFrame } from "../../shell/index.js";

type ReportPageProps = {
  user: CurrentUser;
  csrf: string;
  subjectType?: ReportSubjectType;
  subjectId?: number;
  error?: string;
  message?: string;
};

export function ReportPage(props: ReportPageProps) {
  const canSubmit = !props.message && props.subjectType && props.subjectId;
  return (
    <Layout title="Report" user={props.user}>
      <PageFrame title="Report">
        <FormError>{props.error}</FormError>
        <FormSuccess>{props.message}</FormSuccess>
        {canSubmit ? (
          <FormStack action={reportPathBase}>
            <CsrfInput csrf={props.csrf} />
            <input type="hidden" name="type" value={props.subjectType} />
            <input type="hidden" name="id" value={props.subjectId} />
            <FormField label="Reason">
              <textarea name="reason" rows={8} required placeholder="Reason" maxLength={limits.userText}></textarea>
            </FormField>
            <FormActions>
              <button type="submit"><ActionLabel action="report">Send report</ActionLabel></button>
            </FormActions>
          </FormStack>
        ) : null}
      </PageFrame>
    </Layout>
  );
}
