import type { GroupItem } from "../models.js";
import { groupPath, profilePath } from "../paths.js";
import { plainTextFromHtml } from "../server/security/html.js";
import { truncateText } from "../text.js";
import { classNames } from "./classes.js";
import { MetaSubjectLink } from "./meta.js";
import { Panel } from "./panels.js";
import type { DataAttributes, ViewChild } from "./types.js";

type CommunityBoxGroup = GroupItem & {
  href?: string | null;
};

const communityBoxLimit = 3;

export function GroupSummaryCard({ group }: { group: GroupItem }) {
  return (
    <div class="content-card">
      <h3><a href={groupPath(group)}>{group.name}</a></h3>
      <p class="card-attribution">Owner: <MetaSubjectLink href={profilePath(group.ownerHandle)}>{group.ownerName}</MetaSubjectLink></p>
      <p>{groupDescription(group, 180)}</p>
      <p class="card-note"><small>{memberCountLabel(group.memberCount)}</small></p>
    </div>
  );
}

function CommunityCard({ group }: { group: CommunityBoxGroup }) {
  const href = group.href === undefined ? groupPath(group) : group.href;
  return (
    <article class="content-card community-card">
      <h3 class="community-card__name"><CommunityCardLink href={href}>{group.name}</CommunityCardLink></h3>
      <p class="community-card__description">{groupDescription(group, 90)}</p>
    </article>
  );
}

function CommunityCardLink(props: { href: string | null; children: ViewChild }) {
  if (props.href) return <a href={props.href}>{props.children}</a>;
  return <span>{props.children}</span>;
}

export function CommunityBox(props: {
  title: string;
  groups: CommunityBoxGroup[];
  more?: string;
  prefix?: ViewChild;
  className?: string;
  singleLine?: boolean;
  dataAttributes?: DataAttributes;
}) {
  const groups = props.groups.slice(0, communityBoxLimit);
  return (
    <Panel
      bodyClassName="community-panel__body"
      className={classNames("community-panel", props.className)}
      dataAttributes={props.dataAttributes}
      headerAction={props.more && groups.length ? <a class="community-panel__more" href={props.more}>[view more]</a> : null}
      title={props.title}
      tone="soft"
    >
      {props.prefix ? <div class="community-panel__summary">{props.prefix}</div> : null}
      {groups.length ? (
        <div class={classNames("community-panel__list", props.singleLine ? "community-panel__list--single-line" : undefined)}>
          {groups.map((group) => <CommunityCard group={group} />)}
        </div>
      ) : <p><i>No communities found.</i></p>}
    </Panel>
  );
}

function groupDescription(group: GroupItem, length: number) {
  return truncateText(plainTextFromHtml(group.descriptionHtml), length);
}

function memberCountLabel(count: number) {
  return `${count} ${count === 1 ? "member" : "members"}`;
}
