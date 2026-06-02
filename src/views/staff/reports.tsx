import type { ReportItem } from "../../models.js";
import type { ViewChild } from "../../ui/types.js";
import { limits } from "../../policy.js";
import { UserContent } from "../../ui/userContent.js";
import { CsrfInput, FormActions, FormField, FormStack } from "../../ui/forms.js";
import { MetaSubject, MetaSubjectLink } from "../../ui/meta.js";
import { Panel } from "../../ui/panels.js";
import { profilePath } from "../../paths.js";
import { LocalizedTime } from "../../ui/time.js";

export function ReportsPanel(props: { csrf: string; reports: ReportItem[]; resolvedReports: ReportItem[]; action: string }) {
  return (
    <>
      <Panel title="Open reports">
        {props.reports.length ? props.reports.map((report) => <OpenReportCard action={props.action} csrf={props.csrf} report={report} />) : <p><i>No open reports.</i></p>}
      </Panel>
      <Panel title="Resolved reports" tone="soft">
        {props.resolvedReports.length ? props.resolvedReports.map((report) => <ResolvedReportCard report={report} />) : <p><i>No resolved reports.</i></p>}
      </Panel>
    </>
  );
}

function ReportCard(props: { children?: ViewChild; report: ReportItem }) {
  const report = props.report;
  return (
    <div class="report">
      <p>
        <b>{report.subjectUrl && !report.subjectMissing ? <a href={report.subjectUrl}>{report.subjectLabel}</a> : report.subjectLabel}</b>{" "}
        reported by {report.reporterName ? <MetaSubject>{report.reporterName}</MetaSubject> : "deleted user"} on <LocalizedTime value={report.createdAt} />
      </p>
      <p>
        Author: {report.subjectAuthorHandle ? <MetaSubjectLink href={profilePath(report.subjectAuthorHandle)}>{report.subjectAuthorName ?? `user #${report.subjectAuthorId}`}</MetaSubjectLink> : "unknown"}
        {report.subjectMissing ? " | subject removed" : null}
      </p>
      {report.subjectSummary ? <p class="report__summary">{report.subjectSummary}</p> : null}
      <UserContent html={report.reasonHtml} />
      {props.children}
    </div>
  );
}

function OpenReportCard(props: { action: string; csrf: string; report: ReportItem }) {
  const report = props.report;
  return (
    <ReportCard report={report}>
      <FormStack action={props.action} className="moderation-form">
        <CsrfInput csrf={props.csrf} />
        <input type="hidden" name="id" value={report.id} />
        <FormField label="Moderator note">
          <textarea name="note" rows={2} maxLength={limits.userText} placeholder="Moderator note"></textarea>
        </FormField>
        <FormActions>
          <button class="button--secondary" name="action" value="resolve" type="submit">Resolve</button>
          {report.subjectCanDelete ? <button class="button--danger" name="action" value="delete" type="submit">Delete content</button> : null}
          {report.subjectAuthorId ? <button class="button--danger" name="action" value="ban_author" type="submit">Ban author</button> : null}
          {report.subjectCanDelete && report.subjectAuthorId ? <button class="button--danger" name="action" value="delete_and_ban" type="submit">Delete + ban</button> : null}
        </FormActions>
      </FormStack>
    </ReportCard>
  );
}

function ResolvedReportCard(props: { report: ReportItem }) {
  return (
    <ReportCard report={props.report}>
      {props.report.resolvedAt ? (
        <p class="report__resolution">
          Resolved{props.report.resolvedByName ? <> by <MetaSubject>{props.report.resolvedByName}</MetaSubject></> : null} on <LocalizedTime value={props.report.resolvedAt} />
        </p>
      ) : null}
    </ReportCard>
  );
}
