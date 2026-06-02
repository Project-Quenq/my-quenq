import type { AuditItem } from "../../models.js";
import { auditActionLabel } from "../../auditLabels.js";
import { profilePath } from "../../paths.js";
import { MetaSubject, MetaSubjectLink } from "../../ui/meta.js";
import { Panel } from "../../ui/panels.js";
import { LocalizedTime } from "../../ui/time.js";
import { UserContent } from "../../ui/userContent.js";

export function AuditPanel({ audit }: { audit: AuditItem[] }) {
  return (
    <Panel title="Audit log">
      {audit.length ? (
        <div class="audit-table-wrap">
          <table class="listing-table audit-table">
            <colgroup>
              <col class="audit-table__time-column" />
              <col class="audit-table__actor-column" />
              <col class="audit-table__action-column" />
              <col class="audit-table__subject-column" />
            </colgroup>
            <tbody>
              <tr><th>When</th><th>Moderator</th><th>Action</th><th>Subject</th></tr>
              {audit.map((item) => (
                <tr>
                  <td><LocalizedTime value={item.createdAt} /></td>
                  <td><AuditActor item={item} /></td>
                  <td class="audit-action-cell">
                    <span class="audit-action-name">{auditActionLabel(item.action)}</span>
                    <small>{item.action}</small>
                  </td>
                  <td class="audit-subject-cell">
                    <AuditSubject item={item} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : <p><i>No audit records.</i></p>}
    </Panel>
  );
}

function AuditActor({ item }: { item: AuditItem }) {
  if (item.actorId && item.actorName && item.actorHandle) {
    return (
      <>
        <MetaSubjectLink href={profilePath(item.actorHandle)}>{item.actorName}</MetaSubjectLink>
        <small>user #{item.actorId}</small>
      </>
    );
  }
  if (item.actorId) return <><MetaSubject>deleted user</MetaSubject><small>user #{item.actorId}</small></>;
  return <MetaSubject>system</MetaSubject>;
}

function AuditSubject({ item }: { item: AuditItem }) {
  const subject = item.subjectUrl && !item.subjectMissing
    ? <a href={item.subjectUrl}>{item.subjectLabel}</a>
    : <span>{item.subjectLabel}</span>;

  return (
    <>
      <span class="audit-subject-label">
        {subject}
        {item.subjectMissing ? <small>removed</small> : null}
      </span>
      <small>{subjectIdLabel(item)}</small>
      {item.subjectAuthorHandle ? (
        <small>
          Author: <MetaSubjectLink href={profilePath(item.subjectAuthorHandle)}>{item.subjectAuthorName ?? `user #${item.subjectAuthorId}`}</MetaSubjectLink>
        </small>
      ) : null}
      {item.subjectSummary ? <span class="audit-subject-summary">{item.subjectSummary}</span> : null}
      {item.reasonHtml ? (
        <details class="audit-note">
          <summary>Moderator note</summary>
          <UserContent html={item.reasonHtml} />
        </details>
      ) : null}
    </>
  );
}

function subjectIdLabel(item: AuditItem) {
  return item.subjectId > 0 ? `${item.subjectType} #${item.subjectId}` : item.subjectType;
}
